import { HiOutlineCursorArrowRays, HiOutlinePencilSquare, HiOutlineRocketLaunch } from 'react-icons/hi2';
const steps = [[HiOutlinePencilSquare, 'Capture what matters', 'Add the task, the context, and a realistic deadline while it’s fresh.'], [HiOutlineCursorArrowRays, 'Move work forward', 'Update status as you go. Everyone sees the same clear picture of progress.'], [HiOutlineRocketLaunch, 'Finish with confidence', 'Complete the work, clear your head, and make space for what comes next.']];

export default function HowItWorks() {
  return <section className="section how" id="how-it-works"><div className="container">
    <div className="section-heading"><p className="eyebrow light"><span /> SIMPLE BY DESIGN</p><h2>From idea to done,<br /><em>in three calm steps.</em></h2></div>
    <div className="steps">{steps.map(([Icon, title, text], i) => <article className="step" key={title}><span className="step-number">0{i + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div>
  </div></section>;
}
