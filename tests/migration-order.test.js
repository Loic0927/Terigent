import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';

test('database migrations are contiguous through 013 and declare required relationships', async () => {
  const directory = new URL('../db/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  assert.deepEqual(files.map(name => name.slice(0, 3)), Array.from({ length: 13 }, (_, index) => String(index + 1).padStart(3, '0')));
  const deletion = await readFile(new URL('012_create_user_deletion_workflow.sql', directory), 'utf8');
  const tasks = await readFile(new URL('013_integrate_tasks_projects_staff.sql', directory), 'utf8');
  assert.match(deletion, /project_members|user_deletion_blobs/);
  assert.match(tasks, /REFERENCES projects\(id\)/);
  assert.match(tasks, /REFERENCES users\(id\)/);
  for (const sql of [deletion, tasks]) { assert.match(sql, /^BEGIN;/); assert.match(sql, /COMMIT;\s*$/); }
});
