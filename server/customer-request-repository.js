import { getPool } from './database.js';

const columns = `id::text, user_id::text AS "userId", full_name AS "fullName", email, subject, details, status, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function findUserIdBySession(tokenHash) {
  const result = await getPool().query('SELECT user_id::text AS "userId" FROM user_sessions WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP', [tokenHash]);
  return result.rows[0]?.userId || null;
}
export async function createCustomerRequest({ userId, fullName, email, subject, details }) {
  const result = await getPool().query(`INSERT INTO customer_requests (user_id,full_name,email,subject,details) VALUES ($1,$2,$3,$4,$5) RETURNING id::text, status, created_at AS "createdAt"`, [userId, fullName, email, subject, details]);
  return result.rows[0];
}
export async function listCustomerRequests({ status, limit, offset }) {
  const result = await getPool().query(`SELECT ${columns} FROM customer_requests WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`, [status || null, limit, offset]);
  const count = await getPool().query('SELECT COUNT(*)::int AS total FROM customer_requests WHERE ($1::text IS NULL OR status=$1)', [status || null]);
  return { requests: result.rows, total: count.rows[0].total };
}
export async function getCustomerRequest(id) {
  const result = await getPool().query(`SELECT ${columns} FROM customer_requests WHERE id=$1`, [id]); return result.rows[0] || null;
}
export async function updateCustomerRequestStatus(id, status) {
  const result = await getPool().query(`UPDATE customer_requests SET status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING ${columns}`, [id, status]); return result.rows[0] || null;
}
