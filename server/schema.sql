CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  latest_revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_installation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_uploaded_revision INTEGER NOT NULL DEFAULT 0,
  last_applied_revision INTEGER NOT NULL DEFAULT 0,
  has_unpushed_changes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, client_installation_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_snapshots (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_snapshots (
  user_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  source_device_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stat_records (
  user_id TEXT NOT NULL,
  stat_key TEXT NOT NULL,
  mastery INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  last_reviewed INTEGER NOT NULL,
  exposure_count INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, stat_key)
);

CREATE TABLE IF NOT EXISTS totp_enrollments (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  secret TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

DELETE FROM totp_enrollments
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY email
        ORDER BY
          CASE WHEN consumed_at IS NULL THEN 0 ELSE 1 END,
          created_at DESC,
          id DESC
      ) AS row_num
    FROM totp_enrollments
  ) ranked
  WHERE ranked.row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_totp_enrollments_email
ON totp_enrollments(email);

CREATE TABLE IF NOT EXISTS totp_credentials (
  user_id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
