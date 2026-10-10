import { getPool } from './database.js';

const columns = `t.id::text,t.user_id::text AS "ownerId",t.title,t.description,t.status,t.priority,t.deadline::text,t.reminder,
  t.project_id::text AS "projectId",p.name AS "projectName",t.assignee_user_id::text AS "assigneeUserId",
  assignee.name AS "assigneeName",t.created_at AS "createdAt",t.updated_at AS "updatedAt"`;
const attachmentColumns = `d.id::text,d.original_filename AS "filename",d.mime_type AS "mimeType",d.size_bytes AS "sizeBytes",d.created_at AS "createdAt"`;

export const taskUpdateSql = `UPDATE user_tasks SET title=$2,description=$3,status=$4,priority=$5,deadline=$6,reminder=$7,project_id=$8,assignee_user_id=$9,project='',assignee='',updated_at=CURRENT_TIMESTAMP WHERE id=$1`;

export function taskUpdateParameters(id, task) {
  return [id, task.title, task.description, task.status, task.priority, task.deadline, task.reminder, task.projectId, task.assigneeUserId];
}

function accessSql(principal, alias = 't', parameter = '$1') {
  if (principal.role === 'root') return 'TRUE';
  if (principal.role === 'staff') return `EXISTS(SELECT 1 FROM project_members mine WHERE mine.project_id=${alias}.project_id AND mine.user_id=${parameter})`;
  return `${alias}.user_id=${parameter}`;
}

export async function listTasks(principal) {
  const pool = getPool();
  const values = principal.role === 'root' ? [] : [principal.id];
  const result = await pool.query(`SELECT ${columns} FROM user_tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN users assignee ON assignee.id=t.assignee_user_id WHERE ${accessSql(principal)} ORDER BY t.created_at,t.id`, values);
  if (!result.rows.length) return result.rows;
  const attachments = await pool.query(`SELECT td.task_id::text AS "taskId",${attachmentColumns} FROM task_documents td JOIN user_tasks t ON t.id=td.task_id JOIN documents d ON d.id=td.document_id WHERE ${accessSql(principal)} AND d.status='ready' ORDER BY td.created_at,d.id`, values);
  const byTask = new Map();
  for (const row of attachments.rows) { const list = byTask.get(row.taskId) || []; const { taskId, ...document } = row; list.push(document); byTask.set(taskId, list); }
  return result.rows.map(task => ({ ...task, attachments: byTask.get(task.id) || [] }));
}

export async function listTaskOptions(principal) {
  if (principal.role === 'user') return { projects: [], staff: [], allowPersonal: true };
  const pool = getPool();
  const values = principal.role === 'root' ? [] : [principal.id];
  const projects = await pool.query(`SELECT p.id::text,p.name FROM projects p WHERE ${principal.role === 'root' ? 'TRUE' : 'EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=$1)'} ORDER BY p.name,p.id`, values);
  const staff = await pool.query(`SELECT u.id::text,u.name,u.email,pm.project_id::text AS "projectId" FROM project_members pm JOIN users u ON u.id=pm.user_id WHERE u.role='staff' AND u.deletion_state='active' AND ${principal.role === 'root' ? 'TRUE' : 'EXISTS(SELECT 1 FROM project_members mine WHERE mine.project_id=pm.project_id AND mine.user_id=$1)'} ORDER BY u.name,u.id`, values);
  return { projects: projects.rows, staff: staff.rows, allowPersonal: principal.role === 'root' };
}

async function validateRelations(client, principal, task) {
  if (!task.projectId) return principal.role === 'staff' ? 'project' : null;
  if (principal.role === 'user') return 'project';
  const project = await client.query(`SELECT p.id FROM projects p WHERE p.id=$1 AND ${principal.role === 'root' ? 'TRUE' : 'EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=$2)'} FOR SHARE`, principal.role === 'root' ? [task.projectId] : [task.projectId, principal.id]);
  if (!project.rows[0]) return 'project';
  if (task.assigneeUserId) {
    const assignee = await client.query(`SELECT u.id FROM users u JOIN project_members pm ON pm.user_id=u.id AND pm.project_id=$1 WHERE u.id=$2 AND u.role='staff' AND u.deletion_state='active' FOR SHARE`, [task.projectId, task.assigneeUserId]);
    if (!assignee.rows[0]) return 'assignee';
  }
  return null;
}

async function getTask(client, principal, id) {
  const root = principal.role === 'root';
  const result = await client.query(`SELECT ${columns} FROM user_tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN users assignee ON assignee.id=t.assignee_user_id WHERE t.id=${root?'$1':'$2'} AND ${accessSql(principal)} `, root ? [id] : [principal.id, id]);
  return result.rows[0] || null;
}

export async function createTask(principal, task) {
  if (!principal.id) return { invalid: 'owner' };
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const invalid = await validateRelations(client, principal, task);
    if (invalid) { await client.query('ROLLBACK'); return { invalid }; }
    const result = await client.query(`INSERT INTO user_tasks(user_id,title,description,status,priority,deadline,reminder,project_id,assignee_user_id,project,assignee) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'','') RETURNING id::text`, [principal.id, task.title, task.description, task.status, task.priority, task.deadline, task.reminder, task.projectId, task.assigneeUserId]);
    const created = await getTask(client, principal, result.rows[0].id);
    await client.query('COMMIT');
    return { task: { ...created, attachments: [] } };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function updateTask(principal, id, task) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const root = principal.role === 'root';
    const existing = await client.query(`SELECT t.id FROM user_tasks t WHERE t.id=${root?'$1':'$2'} AND ${accessSql(principal)} FOR UPDATE`, root ? [id] : [principal.id, id]);
    if (!existing.rows[0]) { await client.query('ROLLBACK'); return null; }
    const invalid = await validateRelations(client, principal, task);
    if (invalid) { await client.query('ROLLBACK'); return { invalid }; }
    await client.query(taskUpdateSql, taskUpdateParameters(id, task));
    const updated = await getTask(client, principal, id);
    const attached = await client.query(`SELECT ${attachmentColumns} FROM task_documents td JOIN documents d ON d.id=td.document_id WHERE td.task_id=$1 AND d.status='ready' ORDER BY td.created_at,d.id`, [id]);
    await client.query('COMMIT');
    return { task: { ...updated, attachments: attached.rows } };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function deleteTask(principal, id) {
  const root = principal.role === 'root';
  const result = await getPool().query(`DELETE FROM user_tasks t WHERE t.id=${root?'$1':'$2'} AND ${accessSql(principal)} RETURNING t.id::text`, root ? [id] : [principal.id, id]);
  return result.rows[0] || null;
}

export async function addAttachments(principal, taskId, documentIds) {
  if (!principal.id) return null;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const root = principal.role === 'root';
    const task = await client.query(`SELECT t.id FROM user_tasks t WHERE t.id=${root?'$1':'$2'} AND ${accessSql(principal)} FOR UPDATE`, root ? [taskId] : [principal.id, taskId]);
    if (!task.rows[0]) { await client.query('ROLLBACK'); return null; }
    const found = await client.query(`SELECT id::text FROM documents WHERE user_id=$1 AND status='ready' AND id=ANY($2::bigint[]) FOR SHARE`, [principal.id, documentIds]);
    if (found.rows.length !== documentIds.length) { await client.query('ROLLBACK'); return null; }
    await client.query(`INSERT INTO task_documents(task_id,document_id) SELECT $1,unnest($2::bigint[]) ON CONFLICT DO NOTHING`, [taskId, documentIds]);
    const result = await client.query(`SELECT ${attachmentColumns} FROM task_documents td JOIN documents d ON d.id=td.document_id WHERE td.task_id=$1 AND d.status='ready' ORDER BY td.created_at,d.id`, [taskId]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function removeAttachment(principal, taskId, documentId) {
  const root = principal.role === 'root';
  const result = await getPool().query(`DELETE FROM task_documents td USING user_tasks t WHERE td.task_id=t.id AND td.task_id=${root?'$1':'$2'} AND td.document_id=${root?'$2':'$3'} AND ${accessSql(principal)} RETURNING td.document_id::text`, root ? [taskId, documentId] : [principal.id, taskId, documentId]);
  return result.rows[0] || null;
}
