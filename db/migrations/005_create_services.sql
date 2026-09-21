BEGIN;

CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description VARCHAR(2000) NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 2000),
  category VARCHAR(80) NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  pricing_text VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (pricing_text IS NULL OR char_length(btrim(pricing_text)) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS services_public_listing_idx
  ON services (is_active, created_at DESC, id DESC);

COMMIT;
