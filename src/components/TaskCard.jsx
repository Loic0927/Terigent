import { useRef, useState } from 'react';
import { HiCheck, HiOutlineArrowDownTray, HiOutlineBell, HiOutlineCalendarDays, HiOutlineDocument, HiOutlineEye, HiOutlineLink, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineUser, HiOutlineXMark } from 'react-icons/hi2';
import memberRequest from './memberRequest';
import AttachmentPicker from './AttachmentPicker';
import DocumentPreview from './DocumentPreview';
import { showNotification } from './notifications';

const statusOrder = ['not-started', 'in-progress', 'completed'];
const labels = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed' };
function deadlineState(task) { if (!task.deadline || task.status === 'completed') return null; const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(`${task.deadline}T00:00:00`), days = Math.ceil((due - today) / 86400000); if (days < 0) return { label: 'Overdue', className: 'overdue' }; if (days <= 2) return { label: days === 0 ? 'Due today' : `Due in ${days} day${days > 1 ? 's' : ''}`, className: 'due-soon' }; return null; }

export default function TaskCard({ task, onStatus, onDelete, onEdit, onAttachments }) {
  const [picker, setPicker] = useState(false), [preview, setPreview] = useState(null), [removing, setRemoving] = useState('');
  const previewTrigger = useRef(); const alert = deadlineState(task), nextStatus = statusOrder[(statusOrder.indexOf(task.status) + 1) % statusOrder.length];
  const removeAttachment = async document => { if (removing) return; setRemoving(document.id); try { await memberRequest(`/api/tasks/${task.id}/documents/${document.id}`, { method: 'DELETE' }); onAttachments(task.id, (task.attachments || []).filter(item => item.id !== document.id)); showNotification('Attachment removed.', { type: 'success' }); } catch (problem) { showNotification(problem.message, { type: 'error' }); } finally { setRemoving(''); } };
  const openPreview = (document, event) => { previewTrigger.current = event.currentTarget; setPreview(document); };
  return <article className={`task-card priority-${task.priority.toLowerCase()}`}>
    <div className="task-card-top"><span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-card-actions"><button className="delete-button" type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><HiOutlinePencilSquare /></button><button className="delete-button" type="button" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}><HiOutlineTrash /></button></span></div>
    <h4>{task.title}</h4>{task.description && <p>{task.description}</p>}
    <div className="task-meta">{task.projectName && <span>{task.projectName}</span>}{task.assigneeName && <span><HiOutlineUser /> {task.assigneeName}</span>}</div>
    <div className="deadline"><HiOutlineCalendarDays /><time dateTime={task.deadline}>{new Date(`${task.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>{alert && <b className={alert.className}>{alert.label}</b>}</div>
    {task.reminder !== 'No reminder' && <div className="reminder"><HiOutlineBell /> {task.reminder}</div>}
    <div className="task-attachments"><div className="task-attachments-heading"><strong>Attachments</strong><button type="button" onClick={() => setPicker(true)}><HiOutlineLink /> Attach documents</button></div>{!(task.attachments || []).length ? <span className="no-attachments">No documents attached.</span> : (task.attachments || []).map(document => <div className="task-attachment" key={document.id}>{document.mimeType.startsWith('image/') ? <button className="attachment-thumbnail" type="button" onClick={event => openPreview(document, event)} aria-label={`Preview ${document.filename}`}><img loading="lazy" src={`/api/documents/${document.id}/content`} alt="" /></button> : <span className="attachment-document"><HiOutlineDocument /></span>}<button className="task-attachment-name" type="button" onClick={event => openPreview(document, event)}>{document.filename}</button><div className="attachment-actions"><button type="button" onClick={event => openPreview(document, event)} aria-label={`Preview ${document.filename}`}><HiOutlineEye /></button><a href={`/api/documents/${document.id}/download`} aria-label={`Download ${document.filename}`}><HiOutlineArrowDownTray /></a><button type="button" disabled={Boolean(removing)} onClick={() => removeAttachment(document)} aria-label={`Remove ${document.filename} attachment`}><HiOutlineXMark /></button></div></div>)}</div>
    <button className="status-button" onClick={() => onStatus(task.id, task.status === 'completed' ? 'not-started' : nextStatus)}><HiCheck /> {task.status === 'completed' ? 'Reopen task' : nextStatus === 'completed' ? 'Mark complete' : `Move to ${labels[nextStatus]}`}</button>
    {picker && <AttachmentPicker task={task} onClose={() => setPicker(false)} onSaved={attachments => onAttachments(task.id, attachments)} />}
    {preview && <DocumentPreview document={preview} onClose={() => setPreview(null)} returnFocus={previewTrigger} />}
  </article>;
}
