import { getPool } from './database.js';

const columns = `id::text, name, description, category, pricing_text AS "pricingText", is_active AS active, created_at AS "createdAt", updated_at AS "updatedAt"`;

function matchClues(service, query) {
  if (!query) return [];
  const needle = query.toLocaleLowerCase();
  const fields = [['name', service.name], ['description', service.description], ['category', service.category], ['pricing', service.pricingText]];
  return fields.flatMap(([field, value]) => {
    if (!value) return [];
    const index = value.toLocaleLowerCase().indexOf(needle);
    if (index < 0) return [];
    const start = Math.max(0, index - 45);
    const end = Math.min(value.length, index + query.length + 75);
    return [{ field, snippet: `${start ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}` }];
  });
}

export async function listPublicServices({ q = '', category = '', sort = 'updated_desc', page = 1, limit = 24 } = {}) {
  const pool = getPool();
  const query = buildPublicServiceQuery({ q, category, sort, page, limit });
  const listResult = await pool.query(query.text, query.values);
  const [countResult, categoryResult] = await Promise.all([
    pool.query(query.countText, query.filterValues),
    pool.query('SELECT DISTINCT category FROM services WHERE is_active = TRUE ORDER BY category ASC'),
  ]);
  return {
    services: listResult.rows.map(service => ({ ...service, matches: matchClues(service, q) })),
    total: countResult.rows[0]?.count || 0,
    categories: categoryResult.rows.map(row => row.category),
  };
}

export function buildPublicServiceQuery({ q = '', category = '', sort = 'updated_desc', page = 1, limit = 24 } = {}) {
  const values = [];
  const where = ['is_active = TRUE'];
  if (q) {
    values.push(q.toLocaleLowerCase());
    const parameter = `$${values.length}`;
    where.push(`(POSITION(${parameter} IN LOWER(name)) > 0 OR POSITION(${parameter} IN LOWER(description)) > 0 OR POSITION(${parameter} IN LOWER(category)) > 0 OR POSITION(${parameter} IN LOWER(COALESCE(pricing_text, ''))) > 0)`);
  }
  if (category) { values.push(category); where.push(`category = $${values.length}`); }
  const whereSql = where.join(' AND ');
  const direction = sort === 'updated_asc' ? 'ASC' : 'DESC';
  const filterValues = [...values];
  values.push(limit, (page - 1) * limit);
  return {
    text: `SELECT ${columns} FROM services WHERE ${whereSql} ORDER BY updated_at ${direction}, id ${direction} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    countText: `SELECT COUNT(*)::int AS count FROM services WHERE ${whereSql}`,
    values,
    filterValues,
  };
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
