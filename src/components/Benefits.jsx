import { HiCheck } from 'react-icons/hi2';
const points = ['Start each day knowing what matters', 'Replace status meetings with shared clarity', 'Catch deadlines before they become fire drills', 'Celebrate consistent, visible progress'];
export default function Benefits() {
  return <section className="section benefits" id="benefits"><div className="container benefits-grid">
    <div className="benefits-art"><div className="arch"><div className="sun" /><div className="path" /><span className="milestone one"><HiCheck /></span><span className="milestone two"><HiCheck /></span><span className="milestone three"><HiCheck /></span></div><p>Progress isn’t about rushing.<br />It’s about moving with purpose.</p></div>
    <div><p className="eyebrow"><span /> A BETTER WAY TO WORK</p><h2>Less busywork.<br /><em>More meaningful progress.</em></h2><p className="benefit-lead">Terigent gives your plans enough structure to move forward—and enough breathing room to do your best thinking.</p><ul className="benefit-list">{points.map(x => <li key={x}><span><HiCheck /></span>{x}</li>)}</ul><a className="text-link arrow" href="/register">Create your workspace →</a></div>
  </div></section>;
}
