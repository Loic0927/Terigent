BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_state VARCHAR(16) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_deletion_state_allowed'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_deletion_state_allowed
      CHECK (deletion_state IN ('active', 'pending'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_deletion_jobs (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_deletion_blobs (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, storage_key)
);

CREATE INDEX IF NOT EXISTS user_deletion_blobs_pending_idx
  ON user_deletion_blobs (user_id, storage_key) WHERE deleted_at IS NULL;

COMMIT;
