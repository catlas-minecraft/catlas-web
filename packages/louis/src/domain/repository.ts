import type { DateTime, Effect, Option } from "effect";
import type { SessionId, SessionSecret } from "./model/session/value-object/mod.ts";
import type { UnknownRepositoryError } from "./repository-errors.ts";

export interface DatabaseSession<UserId extends string> {
  id: SessionId.SessionId;
  secretHash: Uint8Array;
  userId: UserId;
  expiresAt: DateTime.DateTime;
  nextVerifiedAt: DateTime.DateTime;
  createdAt: DateTime.DateTime;
}

export interface SessionRepositoryInterface<UserId extends string> {
  getSessionAndUser(
    sessionId: SessionId.SessionId,
  ): Effect.Effect<Option.Option<DatabaseSession<UserId>>, UnknownRepositoryError>;

  getUserSessions(
    userId: UserId,
  ): Effect.Effect<DatabaseSession<UserId>[], UnknownRepositoryError>;

  setSession(
    id: SessionId.SessionId,
    secret: SessionSecret.SessionSecret,
    userId: UserId,
    createdAt: DateTime.DateTime,
    expiresAt: DateTime.DateTime,
    nextVerifiedAt: DateTime.DateTime,
  ): Effect.Effect<void, UnknownRepositoryError>;

  updateSession(
    sessionId: SessionId.SessionId,
    data: {
      expiresAt: DateTime.DateTime;
      nextVerifiedAt: DateTime.DateTime;
    },
  ): Effect.Effect<void, UnknownRepositoryError>;

  deleteSession(sessionId: SessionId.SessionId): Effect.Effect<void, UnknownRepositoryError>;

  deleteUserSessions(userId: UserId): Effect.Effect<void, UnknownRepositoryError>;

  deleteExpiredSessions(): Effect.Effect<void, UnknownRepositoryError>;
}

// export class SessionRepository extends Context.Tag("SessionRepositoryContext")<
//   SessionRepository,
//   SessionRepositoryInterface
// >() {}
