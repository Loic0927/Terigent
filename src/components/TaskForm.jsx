import { useMemo, useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

const empty = { title: '', description: '', status: 'not-started', priority: 'Medium', deadline: '', reminder: 'No reminder', projectId: '', assigneeUserId: '' };
const reminders = ['No reminder', '10 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before'];

export default function TaskForm({ task, options = { projects: [], staff: [], allowPersonal: true }, onSave, onClose }) {
  const editing = Boolean(task);
  const [form, setForm] = useState(task ? { title: task.title, description: task.description, status: task.status, priority: task.priority, deadline: task.deadline, reminder: task.reminder, projectId: task.projectId || '', assigneeUserId: task.assigneeUserId || '' } : empty);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const availableStaff = useMemo(() => options.staff.filter(member => member.projectId === form.projectId), [options.staff, form.projectId]);
  const update = ({ target }) => {
    const next = { ...form, [target.name]: target.value };
    if (target.name === 'projectId' && !options.staff.some(member => member.projectId === target.value && member.id === form.assigneeUserId)) next.assigneeUserId = '';
    setForm(next);
    if (errors[target.name]) setErrors(current => ({ ...current, [target.name]: undefined }));
  };
  const submit = async event => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'A title is required.';
    if (!form.deadline) nextErrors.deadline = 'Choose a deadline.';
    if (!options.allowPersonal && !form.projectId) nextErrors.projectId = 'Choose one of your assigned projects.';
    if (Array.from(form.title.trim()).length > 80) nextErrors.title = 'Keep the title within 80 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSending(true);
    try {
      await onSave({ ...form, projectId: form.projectId || null, assigneeUserId: form.assigneeUserId || null, title: form.title.trim(), description: form.description.trim() });
      onClose();
    } catch (error) {
      if (error.status === 401) { window.location.replace('/login?returnTo=%2Fdashboard'); return; }
      setErrors(error.fields && Object.keys(error.fields).length ? error.fields : { form: error.message });
      setSending(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !sending && onClose()} role="presentation">
    <div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
      <div className="modal-heading"><div><p className="eyebrow"><span /> {editing ? 'EDIT TASK' : 'NEW TASK'}</p><h3 id="task-form-title">{editing ? 'Update task details' : 'What needs doing?'}</h3></div><button className="icon-button" type="button" onClick={onClose} disabled={sending} aria-label="Close form"><HiOutlineXMark /></button></div>
      <form onSubmit={submit} noValidate>
        <label className="full">Title *<input autoFocus name="title" maxLength="80" value={form.title} onChange={update} placeholder="e.g. Review launch copy" />{errors.title && <small className="error">{errors.title}</small>}</label>
        <label className="full">Description<textarea name="description" maxLength="1000" value={form.description} onChange={update} placeholder="Add useful context..." rows="3" />{errors.description && <small className="error">{errors.description}</small>}</label>
        <label>Status<select name="status" value={form.status} onChange={update}><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label>
        <label>Priority<select name="priority" value={form.priority} onChange={update}>{['Low', 'Medium', 'High'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Deadline *<input name="deadline" type="date" value={form.deadline} onChange={update} />{errors.deadline && <small className="error">{errors.deadline}</small>}</label>
        <label>Reminder<select name="reminder" value={form.reminder} onChange={update}>{reminders.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Project<select name="projectId" required={!options.allowPersonal} value={form.projectId} onChange={update}><option value="">{options.allowPersonal ? 'Personal task' : 'Select an assigned project'}</option>{options.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{errors.projectId && <small className="error">{errors.projectId}</small>}</label>
        <label>Assignee<select name="assigneeUserId" value={form.assigneeUserId} onChange={update} disabled={!form.projectId}><option value="">Unassigned</option>{availableStaff.map(member => <option key={`${member.projectId}-${member.id}`} value={member.id}>{member.name}</option>)}</select>{errors.assigneeUserId && <small className="error">{errors.assigneeUserId}</small>}</label>
        {errors.form && <small className="error full" role="alert">{errors.form}</small>}
        <div className="form-actions full"><button type="button" className="button button-ghost" onClick={onClose} disabled={sending}>Cancel</button><button className="button" type="submit" disabled={sending}>{sending ? 'Saving...' : editing ? 'Save changes' : 'Add task'}</button></div>
      </form>
    </div>
  </div>;
}
