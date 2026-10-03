BEGIN;

CREATE TABLE IF NOT EXISTS task_documents (
  task_id BIGINT NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, document_id)
);

CREATE INDEX IF NOT EXISTS task_documents_document_idx
  ON task_documents (document_id, task_id);

COMMIT;
