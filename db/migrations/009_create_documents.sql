BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_filename VARCHAR(180) NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(32) NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 3145728),
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','delete_failed','cleanup_needed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS documents_owner_created_idx
  ON documents (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS documents_cleanup_idx
  ON documents (status, updated_at) WHERE status <> 'ready';

CREATE TABLE IF NOT EXISTS document_upload_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS document_upload_attempts_lookup_idx
  ON document_upload_attempts (user_id, attempted_at DESC);

COMMIT;
