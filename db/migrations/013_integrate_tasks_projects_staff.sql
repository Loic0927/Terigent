BEGIN;

ALTER TABLE user_tasks
  ADD COLUMN IF NOT EXISTS project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_tasks_project_updated_idx
  ON user_tasks (project_id, updated_at DESC, id DESC) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_tasks_assignee_updated_idx
  ON user_tasks (assignee_user_id, updated_at DESC, id DESC) WHERE assignee_user_id IS NOT NULL;

COMMENT ON COLUMN user_tasks.project IS
  'Legacy pre-migration display text. New API writes and authorizes through project_id only.';
COMMENT ON COLUMN user_tasks.assignee IS
  'Legacy pre-migration display text. New API writes and authorizes through assignee_user_id only.';

COMMIT;
