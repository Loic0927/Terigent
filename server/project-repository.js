import { getPool } from './database.js';

const projectColumns = `p.id::text,p.name,p.description,p.status,p.progress,p.client_id::text AS "clientId",c.name AS "clientName",p.created_at AS "createdAt",p.updated_at AS "updatedAt"`;
const memberJson = `COALESCE(json_agg(json_build_object('id',u.id::text,'name',u.name,'email',u.email) ORDER BY u.name) FILTER (WHERE u.id IS NOT NULL),'[]') AS members`;
const grouped = ` FROM projects p JOIN clients c ON c.id=p.client_id LEFT JOIN project_members pm ON pm.project_id=p.id LEFT JOIN users u ON u.id=pm.user_id GROUP BY p.id,c.id`;

export async function listClients({ search, limit, offset }) {
  const value = search ? `%${search.toLowerCase()}%` : null;
  const result = await getPool().query(`SELECT c.id::text,c.name,c.email,c.phone,c.created_at AS "createdAt",c.updated_at AS "updatedAt",COUNT(p.id)::int AS "projectCount" FROM clients c LEFT JOIN projects p ON p.client_id=c.id WHERE ($1::text IS NULL OR lower(c.name) LIKE $1 OR c.email LIKE $1) GROUP BY c.id ORDER BY c.name,c.id LIMIT $2 OFFSET $3`, [value, limit, offset]);
  const count = await getPool().query(`SELECT COUNT(*)::int total FROM clients WHERE ($1::text IS NULL OR lower(name) LIKE $1 OR email LIKE $1)`, [value]);
  return { clients: result.rows, total: count.rows[0].total };
}
export async function createClient(data) { const result=await getPool().query(`INSERT INTO clients(name,email,phone) VALUES($1,$2,$3) RETURNING id::text,name,email,phone,created_at AS "createdAt",updated_at AS "updatedAt"`,[data.name,data.email,data.phone]); return {...result.rows[0],projectCount:0}; }
export async function updateClient(id,data) { const result=await getPool().query(`UPDATE clients SET name=$2,email=$3,phone=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id::text,name,email,phone,created_at AS "createdAt",updated_at AS "updatedAt"`,[id,data.name,data.email,data.phone]); return result.rows[0]||null; }
export async function deleteClient(id) { try { const result=await getPool().query('DELETE FROM clients WHERE id=$1 RETURNING id::text',[id]); return result.rows[0]||null; } catch(error) { if(error?.code==='23503') return { conflict:true }; throw error; } }
export async function listStaff() { const result=await getPool().query(`SELECT id::text,name,email FROM users WHERE role='staff' ORDER BY name,email,id LIMIT 200`); return result.rows; }

export async function listProjects({ principal, search, status, limit, offset }) {
  const value=search?`%${search.toLowerCase()}%`:null; const staff=principal.role==='staff';
  const params=[staff?principal.id:null,value,status||null,limit,offset];
  const access=staff?'EXISTS (SELECT 1 FROM project_members mine WHERE mine.project_id=p.id AND mine.user_id=$1)':'$1::bigint IS NULL';
  const filter=`${access} AND ($2::text IS NULL OR lower(p.name) LIKE $2 OR lower(c.name) LIKE $2) AND ($3::text IS NULL OR p.status=$3)`;
  const result=await getPool().query(`SELECT ${projectColumns},${memberJson}${grouped} HAVING ${filter} ORDER BY p.updated_at DESC,p.id DESC LIMIT $4 OFFSET $5`,params);
  const count=await getPool().query(`SELECT COUNT(*)::int total FROM projects p JOIN clients c ON c.id=p.client_id WHERE ${filter}`,params.slice(0,3));
  return {projects:result.rows,total:count.rows[0].total};
}
export async function getProject(id,principal) { const staff=principal.role==='staff'; const result=await getPool().query(`SELECT ${projectColumns},${memberJson}${grouped} HAVING p.id=$1 AND (${staff?'EXISTS (SELECT 1 FROM project_members mine WHERE mine.project_id=p.id AND mine.user_id=$2)':'$2::bigint IS NULL'})`,[id,staff?principal.id:null]); return result.rows[0]||null; }
export async function projectExists(id) { const result=await getPool().query('SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1) exists',[id]); return result.rows[0].exists; }

async function validateRelations(client,data) {
  const foundClient=await client.query('SELECT id FROM clients WHERE id=$1 FOR SHARE',[data.clientId]); if(!foundClient.rows[0]) return 'client';
  if(data.memberIds.length){const staff=await client.query(`SELECT id::text FROM users WHERE role='staff' AND id=ANY($1::bigint[]) FOR SHARE`,[data.memberIds]);if(staff.rows.length!==data.memberIds.length)return 'members';}
  return null;
}
export async function createProject(data,principal) { const client=await getPool().connect();try{await client.query('BEGIN');const invalid=await validateRelations(client,data);if(invalid){await client.query('ROLLBACK');return {invalid};}const made=await client.query(`INSERT INTO projects(client_id,name,description,status,progress) VALUES($1,$2,$3,$4,$5) RETURNING id::text`,[data.clientId,data.name,data.description,data.status,data.progress]);if(data.memberIds.length)await client.query(`INSERT INTO project_members(project_id,user_id) SELECT $1,unnest($2::bigint[])`,[made.rows[0].id,data.memberIds]);await client.query('COMMIT');return {project:await getProject(made.rows[0].id,principal)};}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();} }
export async function updateProject(id,data,principal) { const client=await getPool().connect();try{await client.query('BEGIN');const locked=await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE',[id]);if(!locked.rows[0]){await client.query('ROLLBACK');return {missing:true};}const invalid=await validateRelations(client,data);if(invalid){await client.query('ROLLBACK');return {invalid};}await client.query(`UPDATE projects SET client_id=$2,name=$3,description=$4,status=$5,progress=$6,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[id,data.clientId,data.name,data.description,data.status,data.progress]);await client.query('DELETE FROM project_members WHERE project_id=$1',[id]);if(data.memberIds.length)await client.query(`INSERT INTO project_members(project_id,user_id) SELECT $1,unnest($2::bigint[])`,[id,data.memberIds]);await client.query('COMMIT');return {project:await getProject(id,principal)};}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();} }
export async function updateStaffProgress(id,userId,data) { const keys=Object.keys(data);const sets=keys.map((key,index)=>`${key}=$${index+3}`).join(',');const values=keys.map(key=>data[key]);const result=await getPool().query(`UPDATE projects p SET ${sets},updated_at=CURRENT_TIMESTAMP WHERE p.id=$1 AND EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=$2) RETURNING p.id::text`,[id,userId,...values]);return result.rows[0]||null; }
export async function deleteProject(id) { const result=await getPool().query('DELETE FROM projects WHERE id=$1 RETURNING id::text',[id]);return result.rows[0]||null; }
