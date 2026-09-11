import { getPool } from './database.js';

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export async function loginBlocked(key) {
  const result = await getPool().query(
    `SELECT COUNT(*)::int AS count FROM admin_login_attempts WHERE attempt_key = $1 AND succeeded = FALSE AND attempted_at > CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')`,
    [key, WINDOW_MINUTES],
  );
  return result.rows[0].count >= MAX_FAILURES;
}

export async function recordLogin(key, succeeded) {
  await getPool().query(
    `INSERT INTO admin_login_attempts (attempt_key, succeeded) VALUES ($1, $2)`,
    [key, succeeded],
  );
  if (Math.random() < 0.05) await getPool().query(`DELETE FROM admin_login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`);
}

export async function clearLoginFailures(key) {
  await getPool().query('DELETE FROM admin_login_attempts WHERE attempt_key = $1 AND succeeded = FALSE', [key]);
}
