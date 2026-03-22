import { type Context, DateTime, Duration, Effect, Option } from "effect";
import type { SessionJwt } from "../../../domain/model/session/value-object/session-jwt.ts";
import type { BaseSessionContext, LouisSessionManager } from "../louis-session-manager.ts";
import type { SessionRepositoryInterface } from "../../../domain/repository.ts";
import type { UnknownRepositoryError } from "../../../domain/repository-errors.ts";
import { JwtService } from "./jwt-service.js";
import type { JwtInvalidError, JwtSignError, JwtVerifyError } from "./jwt-service.ts";
import { InternalError, InvalidSessionTokenError } from "../../../domain/error.js";
import { make as makeLouisSessionManager } from "../louis-session-manager.js";
import { parseSessionToken } from "../../../domain/model/session/value-object/session-token.js";
import { dateTime2Epoch } from "../../../utils.js";

export type SessionUsedResult<UserId extends string> =
  | SessionResultNeedRefreshJwt<UserId>
  | {
      session: BaseSessionContext<UserId>;
      sessionJwt: Option.None<SessionJwt>;
    };

type SessionResultNeedRefreshJwt<UserId extends string> = {
  session: BaseSessionContext<UserId>;
  sessionJwt: Option.Some<SessionJwt>;
};

export interface JwtLouisSessionManager<UserId extends string> extends LouisSessionManager<UserId> {
  createSessionAsJwt: (
    userId: UserId,
  ) => Effect.Effect<SessionResultNeedRefreshJwt<UserId>, UnknownRepositoryError | InternalError>;

  useSessionWithJwt: (
    jwt: SessionJwt,
  ) => Effect.Effect<
    Option.Option<SessionUsedResult<UserId>>,
    | InternalError
    | JwtVerifyError
    | JwtInvalidError
    | UnknownRepositoryError
    | InvalidSessionTokenError
    | JwtSignError
  >;

  revokeSessionWithJwt: (
    jwt: SessionJwt,
  ) => Effect.Effect<
    void,
    InternalError | JwtInvalidError | UnknownRepositoryError | InvalidSessionTokenError
  >;
}

/**
 * JwtLouisSessionManagerを生成する
 */
export const make = Effect.fn(function* <
  UserId extends string,
  SessionRepositoryId,
  SessionRepositoryService extends SessionRepositoryInterface<UserId> =
    SessionRepositoryInterface<UserId>,
>({
  sessionRefreshDuration = Duration.hours(1),
  sessionExpireDuration = Duration.weeks(1),
  SessionRepository,
}: {
  sessionRefreshDuration?: Duration.Duration;
  sessionExpireDuration?: Duration.Duration;
  SessionRepository: Context.Tag<SessionRepositoryId, SessionRepositoryService>;
}) {
  const jwtService = yield* JwtService;

  // Base LouisSessionManager implementation
  const baseManager = yield* makeLouisSessionManager<
    UserId,
    SessionRepositoryId,
    SessionRepositoryService
  >({
    sessionRefreshDuration,
    sessionExpireDuration,
    SessionRepository,
  });

  return {
    ...baseManager,
    createSessionAsJwt: Effect.fn(function* (userId: UserId) {
      const sessionContext = yield* baseManager.createSession(userId);

      // Create JWT with sessionId as payload
      const sessionJwt = yield* jwtService
        .sign({
          stk: sessionContext.sessionToken,
          uid: userId,
          exp: sessionContext.expiresAt.pipe(dateTime2Epoch),
          iat: sessionContext.createdAt.pipe(dateTime2Epoch),
        })
        .pipe(InternalError.from((error) => error.message));

      return {
        session: {
          sessionId: sessionContext.sessionId,
          userId,
          createdAt: sessionContext.createdAt,
          expiresAt: sessionContext.expiresAt,
        },
        sessionJwt: Option.some(sessionJwt) as Option.Some<SessionJwt>,
      };
    }),
    useSessionWithJwt: Effect.fn(function* (jwt) {
      const verifyResult: Option.Option<SessionUsedResult<UserId>> = yield* jwtService
        .verify(jwt)
        .pipe(
          Effect.flatMap(
            Effect.fn(function* ({ stk, uid: sub, iat, exp }) {
              if (!iat || !exp) {
                return Option.none();
              }

              const { sessionId } = yield* parseSessionToken(stk);

              return Option.some({
                session: {
                  sessionId,
                  userId: sub as UserId,
                  createdAt: DateTime.unsafeMake(iat * 1000), // JWT uses seconds
                  expiresAt: DateTime.unsafeMake(exp * 1000), // JWT uses seconds
                },
                sessionJwt: Option.none() as Option.None<SessionJwt>,
              } satisfies SessionUsedResult<UserId>);
            }),
          ),
          Effect.catchTags({
            JwtExpiredError: Effect.fn(function* () {
              const { stk: sessionToken } = yield* jwtService.unsafeDecode(jwt);

              const sessionContext = yield* baseManager.useSession(sessionToken);

              if (Option.isNone(sessionContext)) return Option.none();

              const newJwt = yield* jwtService.sign({
                stk: sessionToken,
                uid: sessionContext.value.userId,
              });

              return Option.some({
                session: {
                  sessionId: sessionContext.value.sessionId,
                  userId: sessionContext.value.userId,
                  createdAt: sessionContext.value.createdAt,
                  expiresAt: sessionContext.value.expiresAt,
                },
                sessionJwt: Option.some(newJwt) as Option.Some<SessionJwt>,
              } satisfies SessionResultNeedRefreshJwt<UserId>);
            }),
          }),
        );

      return verifyResult;
    }),
    revokeSessionWithJwt: Effect.fn(function* (jwt) {
      const { stk } = yield* jwtService.unsafeDecode(jwt);
      yield* baseManager.revokeSession(stk);
    }),
  } satisfies JwtLouisSessionManager<UserId>;
});
