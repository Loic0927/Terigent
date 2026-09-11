import pg from 'pg';

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if (!pool) {
    const useSsl = process.env.DATABASE_SSL !== 'false';
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}
