const allowed = new Set(['title', 'description', 'status', 'priority', 'deadline', 'reminder', 'projectId', 'assigneeUserId']);
const statuses = new Set(['not-started', 'in-progress', 'completed']);
const priorities = new Set(['Low', 'Medium', 'High']);
const reminders = new Set(['No reminder', '10 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before']);
const text = (value, max, required = false) => typeof value === 'string' && (!required || value.trim()) && Array.from(value.trim()).length <= max;
const nullableId = value => value === null || value === '' || /^(?:[1-9]\d*)$/.test(String(value));

export function validateTask(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { valid: false, errors: { form: 'Invalid task data.' } };
  if (Object.keys(body).some(key => !allowed.has(key))) errors.form = 'Request contains unsupported fields.';
  if (!text(body.title, 80, true)) errors.title = 'Title must contain 1–80 characters.';
  if (!text(body.description, 1000)) errors.description = 'Description must not exceed 1000 characters.';
  if (!statuses.has(body.status)) errors.status = 'Choose a valid status.';
  if (!priorities.has(body.priority)) errors.priority = 'Choose a valid priority.';
  if (typeof body.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline) || Number.isNaN(Date.parse(`${body.deadline}T00:00:00Z`))) errors.deadline = 'Choose a valid deadline.';
  if (!reminders.has(body.reminder)) errors.reminder = 'Choose a valid reminder.';
  if (!nullableId(body.projectId ?? null)) errors.projectId = 'Choose a valid project.';
  if (!nullableId(body.assigneeUserId ?? null)) errors.assigneeUserId = 'Choose a valid assignee.';
  if ((body.assigneeUserId ?? null) && !(body.projectId ?? null)) errors.assigneeUserId = 'Choose a project before assigning a team member.';
  if (Object.keys(errors).length) return { valid: false, errors };
  return {
    valid: true,
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      status: body.status,
      priority: body.priority,
      deadline: body.deadline,
      reminder: body.reminder,
      projectId: body.projectId ? String(body.projectId) : null,
      assigneeUserId: body.assigneeUserId ? String(body.assigneeUserId) : null,
    },
  };
}
