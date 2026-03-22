import "@effect/sql-kysely/Pg";
import {
  CatlasKysely,
  type AuthSessionInsert,
  type AuthSessionRow,
  withAuthSchema,
} from "@catlas/db";
import type { DatabaseSession, SessionRepositoryInterface } from "@catlas/louis/domain/repository";
import { UnknownRepositoryError } from "@catlas/louis/domain/repository-errors";
import { hash } from "@catlas/louis/domain/model/session/value-object/session-secret-hash";
import type { SessionId, SessionSecret } from "@catlas/louis/domain/model/session/value-object/mod";
import { Context, DateTime, Effect, Layer, Option } from "effect";

const toRepositoryError = (cause: unknown) =>
  new UnknownRepositoryError({
    cause,
    message: "Session repository operation failed",
  });

const toDateTime = (value: Date | string) => DateTime.unsafeMake(value);

const toDatabaseSession = <UserId extends string>(
  row: AuthSessionRow,
): DatabaseSession<UserId> => ({
  id: row.id as SessionId.SessionId,
  secretHash: row.secret_hash,
  userId: row.user_id as UserId,
  expiresAt: toDateTime(row.expires_at),
  nextVerifiedAt: toDateTime(row.next_verified_at),
  createdAt: toDateTime(row.created_at),
});

const makeSecretHashBytes = (secret: SessionSecret.SessionSecret) =>
  hash(secret).pipe(
    Effect.map((secretHash) => new Uint8Array(Buffer.from(secretHash, "hex"))),
    Effect.mapError(toRepositoryError),
  );

const runQuery = <T, R>(query: Effect.Effect<T, unknown, R>) =>
  query.pipe(Effect.mapError(toRepositoryError));

export class SessionRepository extends Context.Tag("@catlas/api/auth/SessionRepository")<
  SessionRepository,
  SessionRepositoryInterface<string>
>() {}

export const SessionRepositoryLive = Layer.effect(
  SessionRepository,
  Effect.gen(function* () {
    const db = withAuthSchema(yield* CatlasKysely);

    const getSessionAndUser = <UserId extends string>(sessionId: SessionId.SessionId) =>
      db
        .selectFrom("sessions")
        .selectAll()
        .where("id", "=", sessionId)
        .pipe(
          runQuery,
          Effect.map((rows) => rows[0]),
          Effect.map((row) =>
            row === undefined
              ? Option.none<DatabaseSession<UserId>>()
              : Option.some(toDatabaseSession<UserId>(row)),
          ),
        );

    const getUserSessions = <UserId extends string>(userId: UserId) =>
      db
        .selectFrom("sessions")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .pipe(
          runQuery,
          Effect.map((rows) => rows.map((row) => toDatabaseSession<UserId>(row))),
        );

    const setSession = <UserId extends string>(
      id: SessionId.SessionId,
      secret: SessionSecret.SessionSecret,
      userId: UserId,
      createdAt: DateTime.DateTime,
      expiresAt: DateTime.DateTime,
      nextVerifiedAt: DateTime.DateTime,
    ) =>
      makeSecretHashBytes(secret).pipe(
        Effect.flatMap((secretHash) =>
          db
            .insertInto("sessions")
            .values({
              id,
              secret_hash: secretHash,
              user_id: userId,
              created_at: DateTime.toDate(createdAt),
              expires_at: DateTime.toDate(expiresAt),
              next_verified_at: DateTime.toDate(nextVerifiedAt),
            } satisfies AuthSessionInsert)
            .pipe(runQuery),
        ),
        Effect.asVoid,
      );

    const updateSession = (
      sessionId: SessionId.SessionId,
      data: {
        expiresAt: DateTime.DateTime;
        nextVerifiedAt: DateTime.DateTime;
      },
    ) =>
      db
        .updateTable("sessions")
        .set({
          expires_at: DateTime.toDate(data.expiresAt),
          next_verified_at: DateTime.toDate(data.nextVerifiedAt),
        })
        .where("id", "=", sessionId)
        .pipe(runQuery, Effect.asVoid);

    const deleteSession = (sessionId: SessionId.SessionId) =>
      db.deleteFrom("sessions").where("id", "=", sessionId).pipe(runQuery, Effect.asVoid);

    const deleteUserSessions = <UserId extends string>(userId: UserId) =>
      db.deleteFrom("sessions").where("user_id", "=", userId).pipe(runQuery, Effect.asVoid);

    const deleteExpiredSessions = () =>
      Effect.gen(function* () {
        const now = yield* DateTime.now;

        return yield* db
          .deleteFrom("sessions")
          .where("expires_at", "<", DateTime.toDate(now))
          .pipe(runQuery, Effect.asVoid);
      });

    return {
      getSessionAndUser,
      getUserSessions,
      setSession,
      updateSession,
      deleteSession,
      deleteUserSessions,
      deleteExpiredSessions,
    } satisfies SessionRepositoryInterface<string>;
  }),
);
