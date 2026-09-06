const inDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const initialTasks = [
  { id: 'demo-1', title: 'Outline customer interview', description: 'Prepare questions for three early customers.', status: 'not-started', priority: 'Medium', deadline: inDays(3), reminder: '1 day before', assignee: 'Alex', project: 'Research' },
  { id: 'demo-2', title: 'Polish launch page', description: 'Review responsive spacing and final copy.', status: 'in-progress', priority: 'High', deadline: inDays(0), reminder: '1 hour before', assignee: 'Jamie', project: 'Website' },
  { id: 'demo-3', title: 'Define success metrics', description: 'Agree on the first-month product metrics.', status: 'in-progress', priority: 'Medium', deadline: inDays(1), reminder: '1 day before', assignee: 'Sam', project: 'Launch' },
  { id: 'demo-4', title: 'Create project brief', description: 'Capture scope, owners, and key milestones.', status: 'completed', priority: 'Low', deadline: inDays(-2), reminder: 'No reminder', assignee: 'Alex', project: 'Launch' },
];
