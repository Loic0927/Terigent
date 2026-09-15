BEGIN;
CREATE TABLE IF NOT EXISTS user_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(80) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL CHECK (status IN ('not-started','in-progress','completed')),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('Low','Medium','High')),
  deadline DATE NOT NULL,
  reminder VARCHAR(30) NOT NULL DEFAULT 'No reminder' CHECK (reminder IN ('No reminder','10 minutes before','1 hour before','1 day before','3 days before','1 week before')),
  assignee VARCHAR(100) NOT NULL DEFAULT '',
  project VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS user_tasks_owner_created_idx ON user_tasks(user_id, created_at DESC, id DESC);
COMMIT;
