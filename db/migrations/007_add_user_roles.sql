BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(16);

UPDATE users SET role = 'user' WHERE role IS NULL;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_allowed'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_allowed CHECK (role IN ('user', 'staff', 'root'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

COMMIT;
