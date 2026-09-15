import { useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

const empty = { title: '', description: '', status: 'not-started', priority: 'Medium', deadline: '', reminder: 'No reminder', assignee: '', project: '' };
const reminders = ['No reminder', '10 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before'];

export default function TaskForm({ onAdd, onClose }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const update = ({ target }) => setForm({ ...form, [target.name]: target.value });
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'A title is required.';
    if (!form.deadline) nextErrors.deadline = 'Choose a deadline.';
    if (form.title.length > 80) nextErrors.title = 'Keep the title under 80 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSending(true);
    try { await onAdd({ ...form, title: form.title.trim(), description: form.description.trim() }); onClose(); }
    catch (error) { setErrors(error.fields || { form: error.message }); setSending(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
    <div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="new-task-title">
      <div className="modal-heading"><div><p className="eyebrow"><span /> NEW TASK</p><h3 id="new-task-title">What needs doing?</h3></div><button className="icon-button" onClick={onClose} aria-label="Close form"><HiOutlineXMark /></button></div>
      <form onSubmit={submit} noValidate>
        <label className="full">Title *<input autoFocus name="title" value={form.title} onChange={update} placeholder="e.g. Review launch copy" />{errors.title && <small className="error">{errors.title}</small>}</label>
        <label className="full">Description<textarea name="description" value={form.description} onChange={update} placeholder="Add useful context..." rows="3" /></label>
        <label>Status<select name="status" value={form.status} onChange={update}><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label>
        <label>Priority<select name="priority" value={form.priority} onChange={update}>{['Low', 'Medium', 'High'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Deadline *<input name="deadline" type="date" value={form.deadline} onChange={update} />{errors.deadline && <small className="error">{errors.deadline}</small>}</label>
        <label>Reminder<select name="reminder" value={form.reminder} onChange={update}>{reminders.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Assignee<input name="assignee" value={form.assignee} onChange={update} placeholder="Name" /></label>
        <label>Project<input name="project" value={form.project} onChange={update} placeholder="Project name" /></label>
        {errors.form && <small className="error full" role="alert">{errors.form}</small>}<div className="form-actions full"><button type="button" className="button button-ghost" onClick={onClose} disabled={sending}>Cancel</button><button className="button" type="submit" disabled={sending}>{sending ? 'Adding...' : 'Add task'}</button></div>
      </form>
    </div>
  </div>;
}
