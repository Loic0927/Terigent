import { useState } from 'react';
import { HiOutlinePlus, HiOutlineArrowPath } from 'react-icons/hi2';
import useLocalStorage from '../hooks/useLocalStorage';
import { initialTasks } from '../data/initialTasks';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';

const columns = [['not-started', 'Not Started'], ['in-progress', 'In Progress'], ['completed', 'Completed']];

export default function TaskBoard() {
  const [tasks, setTasks] = useLocalStorage('terigent-demo-tasks', initialTasks);
  const [showForm, setShowForm] = useState(false);
  const updateStatus = (id, status) => setTasks(tasks.map(task => task.id === id ? { ...task, status } : task));
  const remove = (id) => setTasks(tasks.filter(task => task.id !== id));
  return <section className="section board-section" id="task-board"><div className="container wide">
    <div className="board-intro"><div><p className="eyebrow"><span /> INTERACTIVE PREVIEW</p><h2>Try your new<br /><em>command center.</em></h2><p>Add a task, move work forward, and see how clarity changes your day. Your demo is saved in this browser.</p></div><div className="board-actions"><button className="button button-ghost" onClick={() => setTasks(initialTasks)}><HiOutlineArrowPath /> Reset demo</button><button className="button" onClick={() => setShowForm(true)}><HiOutlinePlus /> Add task</button></div></div>
    <div className="task-board">{columns.map(([status, label]) => { const items = tasks.filter(t => t.status === status); return <div className={`board-column ${status}`} key={status}><div className="column-title"><div><span /><h3>{label}</h3></div><b>{items.length}</b></div><div className="task-list">{items.map(task => <TaskCard key={task.id} task={task} onStatus={updateStatus} onDelete={remove} />)}{!items.length && <div className="empty-column">No tasks here yet.</div>}</div></div>; })}</div>
    <p className="demo-note">This is a front-end demo. Tasks are stored locally on your device.</p>
    {showForm && <TaskForm onAdd={task => setTasks([...tasks, task])} onClose={() => setShowForm(false)} />}
  </div></section>;
}
