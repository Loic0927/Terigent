import { getPool } from './database.js';

const safeColumns = `id::text, name, email, role, deletion_state AS "deletionState", created_at AS "createdAt"`;

export async function listUsers({ search = '', limit = 20, offset = 0 } = {}) {
  const value = search ? `%${search.toLocaleLowerCase()}%` : null;
  const result = await getPool().query(
    `SELECT ${safeColumns} FROM users
      WHERE role <> 'root'
        AND ($1::text IS NULL OR lower(name) LIKE $1 OR email LIKE $1)
      ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [value, limit, offset],
  );
  const count = await getPool().query(`SELECT COUNT(*)::int total FROM users WHERE role <> 'root' AND ($1::text IS NULL OR lower(name) LIKE $1 OR email LIKE $1)`, [value]);
  return { users: result.rows, total: count.rows[0].total };
}

export async function assignRole(id, role) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [id]);
    const found = await client.query(`SELECT ${safeColumns} FROM users WHERE id=$1 FOR UPDATE`, [id]);
    const user = found.rows[0];
    if (!user || user.role === 'root') { await client.query('ROLLBACK'); return null; }
    const result = await client.query(
      `UPDATE users SET role=$2, updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 AND role IN ('user','staff') AND deletion_state='active' RETURNING ${safeColumns}`,
      [id, role],
    );
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function prepareUserDeletion(id) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT ${safeColumns} FROM users WHERE id=$1 FOR UPDATE`, [id]);
    const user = found.rows[0];
    if (!user || user.role === 'root') { await client.query('ROLLBACK'); return null; }
    const assignment = await client.query('SELECT EXISTS(SELECT 1 FROM project_members WHERE user_id=$1) assigned', [id]);
    if (assignment.rows[0].assigned) { await client.query('ROLLBACK'); return { conflict: 'project-assignment' }; }
    await client.query("UPDATE users SET deletion_state='pending',updated_at=CURRENT_TIMESTAMP WHERE id=$1", [id]);
    await client.query('DELETE FROM user_sessions WHERE user_id=$1', [id]);
    await client.query('INSERT INTO user_deletion_jobs(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP', [id]);
    await client.query(`INSERT INTO user_deletion_blobs(user_id,storage_key)
      SELECT user_id,storage_key FROM documents WHERE user_id=$1
      ON CONFLICT(user_id,storage_key) DO NOTHING`, [id]);
    const pending = await client.query('SELECT storage_key AS "storageKey" FROM user_deletion_blobs WHERE user_id=$1 AND deleted_at IS NULL ORDER BY storage_key', [id]);
    await client.query('COMMIT');
    return { user, blobs: pending.rows };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function markDeletionBlobDeleted(id, storageKey) {
  const result = await getPool().query(`UPDATE user_deletion_blobs SET deleted_at=CURRENT_TIMESTAMP
    WHERE user_id=$1 AND storage_key=$2 AND deleted_at IS NULL RETURNING storage_key`, [id, storageKey]);
  return Boolean(result.rows[0]);
}

export async function finalizeUserDeletion(id) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT ${safeColumns} FROM users WHERE id=$1 AND role<>'root' AND deletion_state='pending' FOR UPDATE`, [id]);
    if (!found.rows[0]) { await client.query('ROLLBACK'); return null; }
    const pending = await client.query('SELECT EXISTS(SELECT 1 FROM user_deletion_blobs WHERE user_id=$1 AND deleted_at IS NULL) pending', [id]);
    if (pending.rows[0].pending) { await client.query('ROLLBACK'); return { pending: true }; }
    const assignment = await client.query('SELECT EXISTS(SELECT 1 FROM project_members WHERE user_id=$1) assigned', [id]);
    if (assignment.rows[0].assigned) { await client.query('ROLLBACK'); return { conflict: 'project-assignment' }; }
    await client.query('DELETE FROM documents WHERE user_id=$1', [id]);
    await client.query('DELETE FROM users WHERE id=$1', [id]);
    await client.query('COMMIT');
    return found.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
