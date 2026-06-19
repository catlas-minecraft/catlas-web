import {
  Api,
  type AuthSession,
  type ChangesetUploadDiffResult,
  type ChangesetUploadPayload,
  type SessionJwtToken,
  type UserId,
  type VerifiedAuthSession,
  type ViewportSnapshot,
} from "@catlas/domain";
import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Effect, Layer } from "effect";

export class EditorApiError extends Error {
  readonly _tag = "EditorApiError";

  constructor(
    message: string,
    readonly conflict: boolean,
    readonly unauthorized: boolean,
    readonly cause: unknown,
  ) {
    super(message);
    this.name = "EditorApiError";
  }
}

export const toEditorApiError = (cause: unknown) => {
  const tag =
    typeof cause === "object" && cause !== null && "_tag" in cause ? String(cause._tag) : "";
  const conflict = [
    "VersionConflictError",
    "ChangesetNotOpenError",
    "InvalidTopologyError",
    "InvalidGeometryStateError",
  ].includes(tag);
  const unauthorized = tag === "UnauthorizedError";
  const message =
    typeof cause === "object" && cause !== null && "message" in cause
      ? String(cause.message)
      : tag || "The API request failed.";
  return new EditorApiError(message, conflict, unauthorized, cause);
};

export type EditorApiService = {
  readonly createSession: (userId: string) => Effect.Effect<AuthSession, EditorApiError>;
  readonly verifySession: (
    sessionJwt: string,
  ) => Effect.Effect<VerifiedAuthSession, EditorApiError>;
  readonly revokeSession: (sessionJwt: string) => Effect.Effect<void, EditorApiError>;
  readonly loadViewport: (
    bbox: readonly [number, number, number, number],
  ) => Effect.Effect<ViewportSnapshot, EditorApiError>;
  readonly save: (
    payload: ChangesetUploadPayload,
    comment: string | null,
  ) => Effect.Effect<ChangesetUploadDiffResult, EditorApiError>;
};

export class EditorApi extends Context.Tag("@catlas/editor/EditorApi")<
  EditorApi,
  EditorApiService
>() {}

export const EditorApiLive = (baseUrl: string, getSessionJwt: () => string | null = () => null) =>
  Layer.effect(
    EditorApi,
    HttpApiClient.make(Api, {
      baseUrl,
      transformClient: HttpClient.mapRequest((request) => {
        const sessionJwt = getSessionJwt();
        return sessionJwt ? HttpClientRequest.bearerToken(request, sessionJwt) : request;
      }),
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.map(
        (client): EditorApiService => ({
          createSession: (userId) =>
            client.auth
              .createSession({ payload: { userId: userId as UserId } })
              .pipe(Effect.mapError(toEditorApiError)),
          verifySession: (sessionJwt) =>
            client.auth
              .verifySession({ payload: { sessionJwt: sessionJwt as SessionJwtToken } })
              .pipe(Effect.mapError(toEditorApiError)),
          revokeSession: (sessionJwt) =>
            client.auth
              .revokeSession({ payload: { sessionJwt: sessionJwt as SessionJwtToken } })
              .pipe(Effect.mapError(toEditorApiError)),
          loadViewport: (bbox) =>
            client.viewport
              .getViewport({
                urlParams: { bbox: bbox.join(","), includeRelations: false },
              })
              .pipe(Effect.mapError(toEditorApiError)),
          save: (payload, comment) =>
            Effect.gen(function* () {
              const created = yield* client.changesets.createChangesetOsm({
                payload: { comment },
              });
              return yield* client.changesets.uploadChangeset({
                path: { id: created.changesetId },
                payload,
              });
            }).pipe(Effect.mapError(toEditorApiError)),
        }),
      ),
    ),
  );
