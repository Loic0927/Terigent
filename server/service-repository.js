import { getPool } from './database.js';

const columns = `id::text, name, description, category, pricing_text AS "pricingText", is_active AS active, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listPublicServices() {
  const result = await getPool().query(`SELECT ${columns} FROM services WHERE is_active = TRUE ORDER BY created_at DESC, id DESC`);
  return result.rows;
}

export async function listAdminServices() {
  const result = await getPool().query(`SELECT ${columns} FROM services ORDER BY created_at DESC, id DESC`);
  return result.rows;
}

export async function createService({ name, description, category, pricingText, active }) {
  const result = await getPool().query(
    `INSERT INTO services (name, description, category, pricing_text, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
    [name, description, category, pricingText, active],
  );
  return result.rows[0];
}

export async function updateService(id, { name, description, category, pricingText, active }) {
  const result = await getPool().query(
    `UPDATE services SET name = $2, description = $3, category = $4, pricing_text = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${columns}`,
    [id, name, description, category, pricingText, active],
  );
  return result.rows[0] || null;
}

export async function deleteService(id) {
  const result = await getPool().query('DELETE FROM services WHERE id = $1 RETURNING id::text', [id]);
  return result.rows[0] || null;
}
