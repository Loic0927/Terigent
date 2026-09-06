import { HiOutlineBell, HiOutlineCalendarDays, HiOutlineChartBarSquare, HiOutlineSquares2X2, HiOutlineUserGroup, HiOutlineFlag } from 'react-icons/hi2';

const features = [
  [HiOutlineSquares2X2, 'Clear task boards', 'See every commitment at a glance, organized by what’s next, underway, and done.'],
  [HiOutlineCalendarDays, 'Deadlines that guide', 'Give work a clear finish line and instantly spot what needs attention today.'],
  [HiOutlineBell, 'Helpful reminders', 'Choose when to be reminded so important details never have to live in your head.'],
  [HiOutlineFlag, 'Thoughtful priorities', 'Use simple priority levels to protect focus and make the next decision obvious.'],
  [HiOutlineUserGroup, 'Shared ownership', 'Assign work with context so small teams stay aligned without constant check-ins.'],
  [HiOutlineChartBarSquare, 'Visible progress', 'Turn scattered effort into steady momentum everyone can see and celebrate.'],
];

export default function Features() {
  return <section className="section features" id="features"><div className="container">
    <div className="section-heading centered"><p className="eyebrow"><span /> MADE FOR FOCUSED TEAMS</p><h2>Everything you need.<br /><em>Nothing you don’t.</em></h2><p>A purposeful set of tools designed to make planning feel lighter and progress feel natural.</p></div>
    <div className="feature-grid">{features.map(([Icon, title, text], index) => <article className="feature-card" key={title}><span className={`feature-icon icon-${index + 1}`}><Icon /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
  </div></section>;
}
