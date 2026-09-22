BEGIN;

CREATE TABLE IF NOT EXISTS customer_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(100) NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 100),
  email VARCHAR(254) NOT NULL CHECK (email = lower(email)),
  subject VARCHAR(150) NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 150),
  details VARCHAR(5000) NOT NULL CHECK (char_length(btrim(details)) BETWEEN 1 AND 5000),
  status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS customer_requests_status_created_idx
  ON customer_requests (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS customer_requests_user_id_idx
  ON customer_requests (user_id) WHERE user_id IS NOT NULL;

COMMIT;
