import { HiCheck, HiOutlineBell, HiOutlineCalendarDays, HiOutlineTrash, HiOutlineUser } from 'react-icons/hi2';

const statusOrder = ['not-started', 'in-progress', 'completed'];
const labels = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed' };

function deadlineState(task) {
  if (!task.deadline || task.status === 'completed') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.deadline}T00:00:00`);
  const days = Math.ceil((due - today) / 86400000);
  if (days < 0) return { label: 'Overdue', className: 'overdue' };
  if (days <= 2) return { label: days === 0 ? 'Due today' : `Due in ${days} day${days > 1 ? 's' : ''}`, className: 'due-soon' };
  return null;
}

export default function TaskCard({ task, onStatus, onDelete }) {
  const alert = deadlineState(task);
  const nextStatus = statusOrder[(statusOrder.indexOf(task.status) + 1) % statusOrder.length];
  return <article className={`task-card priority-${task.priority.toLowerCase()}`}>
    <div className="task-card-top"><span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span><button className="delete-button" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}><HiOutlineTrash /></button></div>
    <h4>{task.title}</h4>{task.description && <p>{task.description}</p>}
    <div className="task-meta">{task.project && <span>{task.project}</span>}{task.assignee && <span><HiOutlineUser /> {task.assignee}</span>}</div>
    <div className="deadline"><HiOutlineCalendarDays /><time dateTime={task.deadline}>{new Date(`${task.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>{alert && <b className={alert.className}>{alert.label}</b>}</div>
    {task.reminder !== 'No reminder' && <div className="reminder"><HiOutlineBell /> {task.reminder}</div>}
    <button className="status-button" onClick={() => onStatus(task.id, task.status === 'completed' ? 'not-started' : nextStatus)}><HiCheck /> {task.status === 'completed' ? 'Reopen task' : nextStatus === 'completed' ? 'Mark complete' : `Move to ${labels[nextStatus]}`}</button>
  </article>;
}
