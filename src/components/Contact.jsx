import { useState } from 'react';
import { HiArrowRight, HiCheck } from 'react-icons/hi2';
export default function Contact() {
  const [sent, setSent] = useState(false);
  const submit = e => { e.preventDefault(); if (e.currentTarget.checkValidity()) setSent(true); };
  return <section className="section contact" id="contact"><div className="container contact-card">
    <div><p className="eyebrow light"><span /> STAY IN THE LOOP</p><h2>Build better days,<br /><em>one task at a time.</em></h2><p>Terigent is taking shape. Leave your email and we’ll let you know when the full experience is ready.</p></div>
    {sent ? <div className="success-message"><HiCheck /><div><b>You’re on the list.</b><span>Thanks for following our journey.</span></div></div> : <form className="contact-form" onSubmit={submit}><label htmlFor="email">Work email</label><div><input id="email" type="email" required placeholder="you@company.com" /><button className="button" type="submit">Keep me posted <HiArrowRight /></button></div><small>No noise. Just meaningful product updates.</small></form>}
  </div></section>;
}
