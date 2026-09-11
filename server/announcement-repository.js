import { getPool } from './database.js';

const columns = `id::text, title, content, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listAnnouncements() {
  const result = await getPool().query(`SELECT ${columns} FROM announcements ORDER BY created_at DESC, id DESC`);
  return result.rows;
}

export async function createAnnouncement({ title, content }) {
  const result = await getPool().query(
    `INSERT INTO announcements (title, content) VALUES ($1, $2) RETURNING ${columns}`,
    [title, content],
  );
  return result.rows[0];
}

export async function updateAnnouncement(id, { title, content }) {
  const result = await getPool().query(
    `UPDATE announcements SET title = $2, content = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${columns}`,
    [id, title, content],
  );
  return result.rows[0] || null;
}

export async function deleteAnnouncement(id) {
  const result = await getPool().query('DELETE FROM announcements WHERE id = $1 RETURNING id::text', [id]);
  return result.rows[0] || null;
}
