const allowed = new Set(['title','description','status','priority','deadline','reminder','assignee','project']);
const statuses = new Set(['not-started','in-progress','completed']);
const priorities = new Set(['Low','Medium','High']);
const reminders = new Set(['No reminder','10 minutes before','1 hour before','1 day before','3 days before','1 week before']);
const text = (value, max, required=false) => typeof value === 'string' && (!required || value.trim()) && Array.from(value.trim()).length <= max;

export function validateTask(body) {
  const errors={};
  if(Object.keys(body).some(key=>!allowed.has(key))) errors.form='Request contains unsupported fields.';
  if(!text(body.title,80,true)) errors.title='Title must contain 1–80 characters.';
  if(!text(body.description,1000)) errors.description='Description must not exceed 1000 characters.';
  if(!statuses.has(body.status)) errors.status='Choose a valid status.';
  if(!priorities.has(body.priority)) errors.priority='Choose a valid priority.';
  if(typeof body.deadline!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)||Number.isNaN(Date.parse(`${body.deadline}T00:00:00Z`))) errors.deadline='Choose a valid deadline.';
  if(!reminders.has(body.reminder)) errors.reminder='Choose a valid reminder.';
  if(!text(body.assignee,100)) errors.assignee='Assignee must not exceed 100 characters.';
  if(!text(body.project,100)) errors.project='Project must not exceed 100 characters.';
  if(Object.keys(errors).length)return {valid:false,errors};
  return {valid:true,data:{title:body.title.trim(),description:body.description.trim(),status:body.status,priority:body.priority,deadline:body.deadline,reminder:body.reminder,assignee:body.assignee.trim(),project:body.project.trim()}};
}
