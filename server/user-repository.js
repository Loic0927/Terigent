import { getPool } from './database.js';

const publicColumns = `id::text, name, email, created_at AS "createdAt"`;
export async function createUser({ name, email, passwordHash }) {
  const result = await getPool().query(`INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING ${publicColumns}`, [name, email, passwordHash]);
  return result.rows[0];
}
export async function findUserForLogin(email) {
  const result = await getPool().query(`SELECT ${publicColumns}, password_hash AS "passwordHash" FROM users WHERE email=$1`, [email]); return result.rows[0] || null;
}
export async function createSession({ userId, tokenHash, expiresAt }) {
  await getPool().query('INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3)', [userId, tokenHash, expiresAt]);
}
export async function findSession(tokenHash) {
  const result = await getPool().query(`SELECT u.id::text, u.name, u.email, u.created_at AS "createdAt" FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>CURRENT_TIMESTAMP`, [tokenHash]); return result.rows[0] || null;
}
export async function revokeSession(tokenHash) { await getPool().query('DELETE FROM user_sessions WHERE token_hash=$1', [tokenHash]); }
export async function rateLimited(key, action, limit) {
  const result = await getPool().query(`SELECT COUNT(*)::int count FROM user_auth_attempts WHERE attempt_key=$1 AND action=$2 AND attempted_at>CURRENT_TIMESTAMP-INTERVAL '15 minutes'`, [key, action]); return result.rows[0].count >= limit;
}
export async function recordAttempt(key, action) {
  await getPool().query('INSERT INTO user_auth_attempts (attempt_key,action) VALUES ($1,$2)', [key, action]);
  if (Math.random() < .05) await getPool().query("DELETE FROM user_auth_attempts WHERE attempted_at<CURRENT_TIMESTAMP-INTERVAL '1 day'; DELETE FROM user_sessions WHERE expires_at<CURRENT_TIMESTAMP");
}
export async function clearAttempts(key, action) { await getPool().query('DELETE FROM user_auth_attempts WHERE attempt_key=$1 AND action=$2', [key, action]); }
