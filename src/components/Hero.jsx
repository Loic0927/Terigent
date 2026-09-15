import { useEffect,useState } from 'react';
import { HiArrowRight, HiCheck, HiOutlineCalendarDays, HiOutlineClock, HiOutlineUserGroup } from 'react-icons/hi2';

export default function Hero() {
  const [member,setMember]=useState(null);useEffect(()=>{fetch('/api/auth/me').then(response=>response.ok?response.json():null).then(payload=>setMember(payload?.user||false)).catch(()=>setMember(false));},[]);
  return <section className="hero section" aria-labelledby="hero-title">
    <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
    <div className="container hero-grid">
      <div className="hero-copy">
        <p className="eyebrow"><span /> Thoughtful work, remarkable results</p>
        <h1 id="hero-title">Make every task<br /><em>count.</em></h1>
        <p className="hero-lead">The calm, considered workspace for people who care about doing great work—not just more work.</p>
        <div className="hero-actions">{member!==null&&<a href={member?'/dashboard':'/register'} className="button">{member?'Open workspace':'Get started'} <HiArrowRight /></a>}<a href="#how-it-works" className="text-link">See how it works</a></div>
        <div className="hero-proof"><span><HiCheck /> Private workspace</span><span><HiCheck /> Your tasks stay with your account</span></div>
      </div>
      <div className="hero-visual" aria-label="Terigent product preview">
        <div className="mini-window">
          <div className="window-top"><div><i /><i /><i /></div><span>Weekly Focus</span><b>•••</b></div>
          <div className="focus-header"><div><small>MONDAY, SEPT 7</small><h3>Good morning, Alex.</h3><p>Here’s what deserves your attention.</p></div><span className="avatar">AM</span></div>
          <div className="focus-stats"><div><HiOutlineCalendarDays /><span><b>6</b> open tasks</span></div><div><HiOutlineClock /><span><b>2</b> due soon</span></div><div><HiOutlineUserGroup /><span><b>4</b> teammates</span></div></div>
          <div className="focus-card coral"><span className="check-ring" /><div><small>HIGH PRIORITY</small><b>Finalize launch strategy</b><p>Website launch · Due today</p></div><span className="avatar tiny">JK</span></div>
          <div className="focus-card"><span className="check-ring done"><HiCheck /></span><div><small>COMPLETED</small><b>Review Q3 performance</b><p>Operations · Yesterday</p></div><span className="avatar tiny green">SL</span></div>
        </div>
        <div className="floating-note"><HiCheck /><span><b>Momentum unlocked</b><small>12 tasks completed this week</small></span></div>
      </div>
    </div>
  </section>;
}
