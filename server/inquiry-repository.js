import { getPool } from './database.js';

export async function createInquiry({ name, email, subject, message }) {
  const result = await getPool().query(
    `INSERT INTO inquiries (name, email, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at AS "createdAt"`,
    [name, email, subject, message],
  );
  return result.rows[0];
}
