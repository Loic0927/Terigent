import { getPool } from './database.js';

const safeColumns = `id::text, name, email, role, created_at AS "createdAt"`;

export async function listUsers(search) {
  const value = search ? `%${search.toLocaleLowerCase()}%` : null;
  const result = await getPool().query(
    `SELECT ${safeColumns} FROM users
      WHERE ($1::text IS NULL OR lower(name) LIKE $1 OR email LIKE $1)
      ORDER BY created_at DESC, id DESC LIMIT 100`,
    [value],
  );
  return result.rows;
}

export async function assignRole(id, role) {
  const result = await getPool().query(
    `UPDATE users SET role=$2, updated_at=CURRENT_TIMESTAMP
      WHERE id=$1 AND role IN ('user','staff') RETURNING ${safeColumns}`,
    [id, role],
  );
  return result.rows[0] || null;
}

export async function deleteUser(id) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT ${safeColumns} FROM users WHERE id=$1 FOR UPDATE`, [id]);
    const user = found.rows[0];
    if (!user || user.role === 'root') { await client.query('ROLLBACK'); return null; }
    await client.query('DELETE FROM user_sessions WHERE user_id=$1', [id]);
    await client.query('DELETE FROM users WHERE id=$1', [id]);
    await client.query('COMMIT');
    return user;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
