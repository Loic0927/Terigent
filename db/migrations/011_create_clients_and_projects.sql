BEGIN;

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  email VARCHAR(254) NOT NULL CHECK (email = lower(email)),
  phone VARCHAR(40) NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS clients_name_idx ON clients (lower(name), id);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description VARCHAR(3000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started','in-progress','completed','on-hold')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS projects_client_idx ON projects (client_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS project_members (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members (user_id, project_id);

COMMIT;
