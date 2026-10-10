import { getPool } from './database.js';
const columns = `id::text, original_filename AS "filename", mime_type AS "mimeType", size_bytes AS "sizeBytes", status, created_at AS "createdAt"`;
const internalColumns = `${columns}, storage_key AS "storageKey"`;

export async function listDocuments(userId, cursor, limit) {
  const values = [userId, limit + 1];
  let cursorSql = '';
  if (cursor) { values.push(cursor.createdAt, cursor.id); cursorSql = 'AND (created_at,id) < ($3::timestamptz,$4::bigint)'; }
  const result = await getPool().query(`SELECT ${columns} FROM documents WHERE user_id=$1 AND status IN ('ready','delete_failed') ${cursorSql} ORDER BY created_at DESC,id DESC LIMIT $2`, values);
  const hasMore = result.rows.length > limit; const rows = result.rows.slice(0, limit);
  return { documents: rows, nextCursor: hasMore ? encodeCursor(rows.at(-1)) : null };
}
const encodeCursor = row => Buffer.from(JSON.stringify([row.createdAt, row.id])).toString('base64url');
export function decodeCursor(value) { try { const [createdAt,id]=JSON.parse(Buffer.from(value,'base64url').toString()); if(!createdAt||!/^[1-9]\d*$/.test(String(id))||Number.isNaN(Date.parse(createdAt)))return null; return {createdAt,id}; } catch { return null; } }

export async function reserveUpload(userId, document, storageKey, maxDocuments = 30) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);
    const owner = await client.query("SELECT deletion_state FROM users WHERE id=$1 FOR SHARE", [userId]);
    if (!owner.rows[0] || owner.rows[0].deletion_state !== 'active') { await client.query('ROLLBACK'); return { deletionPending: true }; }
    const recent = await client.query("SELECT count(*)::int AS count FROM document_upload_attempts WHERE user_id=$1 AND attempted_at > CURRENT_TIMESTAMP-INTERVAL '15 minutes'",[userId]);
    if (recent.rows[0].count >= 20) { await client.query('ROLLBACK'); return { rateLimited: true }; }
    await client.query('INSERT INTO document_upload_attempts(user_id) VALUES($1)',[userId]);
    const count = await client.query("SELECT count(*)::int AS count FROM documents WHERE user_id=$1 AND status IN ('pending','ready','delete_failed','cleanup_needed')",[userId]);
    if (count.rows[0].count >= maxDocuments) { await client.query('ROLLBACK'); return { limitReached: true }; }
    const result = await client.query(`INSERT INTO documents(user_id,original_filename,storage_key,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5) RETURNING ${columns}`,[userId,document.filename,storageKey,document.mimeType,document.sizeBytes]);
    await client.query('COMMIT'); return { document: result.rows[0] };
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
export async function markReady(userId,id){const result=await getPool().query(`UPDATE documents SET status='ready',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING ${columns}`,[id,userId]);return result.rows[0]||null;}
export async function markCleanupNeeded(userId,id){await getPool().query("UPDATE documents SET status='cleanup_needed',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2",[id,userId]);}
export async function removeReservation(userId,id){await getPool().query("DELETE FROM documents WHERE id=$1 AND user_id=$2 AND status IN ('pending','cleanup_needed')",[id,userId]);}
export async function findDocument(userId,id){const result=await getPool().query(`SELECT ${internalColumns} FROM documents WHERE id=$1 AND user_id=$2 AND status IN ('ready','delete_failed')`,[id,userId]);return result.rows[0]||null;}
export async function findReadyDocument(userId,id){const result=await getPool().query(`SELECT ${internalColumns} FROM documents WHERE id=$1 AND user_id=$2 AND status='ready'`,[id,userId]);return result.rows[0]||null;}
export async function findAccessibleReadyDocument(principal,id){
  const access=principal.role==='root'?'TRUE':principal.role==='staff'?`(d.user_id=$2 OR EXISTS(SELECT 1 FROM task_documents td JOIN user_tasks t ON t.id=td.task_id JOIN project_members pm ON pm.project_id=t.project_id WHERE td.document_id=d.id AND pm.user_id=$2))`:'d.user_id=$2';
  const result=await getPool().query(`SELECT d.id::text,d.original_filename AS "filename",d.mime_type AS "mimeType",d.size_bytes AS "sizeBytes",d.status,d.created_at AS "createdAt",d.storage_key AS "storageKey" FROM documents d WHERE d.id=$1 AND d.status='ready' AND ${access}`,principal.role==='root'?[id]:[id,principal.id]);
  return result.rows[0]||null;
}
export async function markDeleteFailed(userId,id){await getPool().query("UPDATE documents SET status='delete_failed',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2",[id,userId]);}
export async function finishDelete(userId,id){const result=await getPool().query("DELETE FROM documents WHERE id=$1 AND user_id=$2 AND status IN ('ready','delete_failed') RETURNING id",[id,userId]);return Boolean(result.rows[0]);}
export async function listKeysForUser(userId){const result=await getPool().query('SELECT storage_key AS "storageKey" FROM documents WHERE user_id=$1',[userId]);return result.rows;}
export async function listCleanupNeeded(userId){const result=await getPool().query("SELECT id::text,storage_key AS \"storageKey\" FROM documents WHERE user_id=$1 AND status='cleanup_needed' ORDER BY updated_at LIMIT 5",[userId]);return result.rows;}
