import { describe, expect, test } from "vite-plus/test";
import {
  AUTH_SESSION_STORAGE_KEY,
  clearStoredAuthSession,
  readStoredAuthSession,
  storedSessionFromVerified,
  type StoredAuthSession,
  writeStoredAuthSession,
} from "../src/lib/editor/auth";

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("editor authentication storage", () => {
  test("persists and clears a tab-scoped session", () => {
    const storage = makeStorage();
    const session: StoredAuthSession = {
      userId: "demo-user",
      sessionJwt: "session-token",
      expiresAt: 123,
    };

    writeStoredAuthSession(session, storage);
    expect(readStoredAuthSession(storage)).toEqual(session);

    clearStoredAuthSession(storage);
    expect(readStoredAuthSession(storage)).toBeNull();
  });

  test("removes malformed stored credentials", () => {
    const storage = makeStorage();
    storage.setItem(AUTH_SESSION_STORAGE_KEY, '{"userId":""}');

    expect(readStoredAuthSession(storage)).toBeNull();
    expect(storage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  test("uses a refreshed JWT returned by session verification", () => {
    const current: StoredAuthSession = {
      userId: "demo-user",
      sessionJwt: "old-token",
      expiresAt: 100,
    };
    const verified = {
      sessionId: "session-id",
      userId: "demo-user",
      createdAt: 1,
      expiresAt: 200,
      refreshedSessionJwt: "new-token",
    } as Parameters<typeof storedSessionFromVerified>[1];

    expect(storedSessionFromVerified(current, verified)).toEqual({
      userId: "demo-user",
      sessionJwt: "new-token",
      expiresAt: 200,
    });
  });
});
