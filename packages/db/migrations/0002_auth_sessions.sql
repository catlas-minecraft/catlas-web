CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.sessions (
  id text PRIMARY KEY,
  secret_hash bytea NOT NULL,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  next_verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth.sessions (user_id);

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON auth.sessions (expires_at);

CREATE INDEX IF NOT EXISTS auth_sessions_next_verified_at_idx
  ON auth.sessions (next_verified_at);
