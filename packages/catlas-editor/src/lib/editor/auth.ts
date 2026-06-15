import type { AuthSession, VerifiedAuthSession } from "@catlas/domain";

export const AUTH_SESSION_STORAGE_KEY = "catlas.editor.auth-session";

export type StoredAuthSession = {
  readonly userId: string;
  readonly sessionJwt: string;
  readonly expiresAt: number;
};

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const browserSessionStorage = (): SessionStorage | null =>
  typeof window === "undefined" ? null : window.sessionStorage;

export const readStoredAuthSession = (
  storage: SessionStorage | null = browserSessionStorage(),
): StoredAuthSession | null => {
  if (!storage) return null;
  const serialized = storage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized) as Partial<StoredAuthSession>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.sessionJwt !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.userId.trim() === "" ||
      parsed.sessionJwt.trim() === ""
    ) {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return null;
    }
    return {
      userId: parsed.userId,
      sessionJwt: parsed.sessionJwt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
};

export const writeStoredAuthSession = (
  session: StoredAuthSession,
  storage: SessionStorage | null = browserSessionStorage(),
) => storage?.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));

export const clearStoredAuthSession = (storage: SessionStorage | null = browserSessionStorage()) =>
  storage?.removeItem(AUTH_SESSION_STORAGE_KEY);

export const storedSessionFromCreated = (session: AuthSession): StoredAuthSession => ({
  userId: session.userId,
  sessionJwt: session.sessionJwt,
  expiresAt: session.expiresAt,
});

export const storedSessionFromVerified = (
  current: StoredAuthSession,
  verified: VerifiedAuthSession,
): StoredAuthSession => ({
  userId: verified.userId,
  sessionJwt: verified.refreshedSessionJwt ?? current.sessionJwt,
  expiresAt: verified.expiresAt,
});
