import { useState } from 'react';
import { HiArrowRight, HiCheck } from 'react-icons/hi2';

const INITIAL_FORM = { name: '', email: '', subject: '', message: '', website: '' };
const LIMITS = { name: 100, email: 254, subject: 150, message: 5000 };

function validate(values) {
  const errors = {};
  for (const field of ['name', 'email', 'subject', 'message']) {
    const value = values[field].trim();
    if (!value) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    else if (value.length > LIMITS[field]) errors[field] = `Maximum ${LIMITS[field]} characters.`;
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');

  const update = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    if (errors[name]) setErrors(current => ({ ...current, [name]: undefined }));
  };

  const submit = async event => {
    event.preventDefault();
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      setStatus('error');
      setNotice('Please correct the highlighted fields.');
      return;
    }
    setStatus('sending'); setErrors({}); setNotice('');
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload.errors) setErrors(payload.errors);
        throw new Error(payload.error || 'We could not send your inquiry right now. Please try again later.');
      }
      setForm(INITIAL_FORM); setStatus('success'); setNotice(payload.message || 'Thanks. Your inquiry has been received.');
    } catch (error) {
      setStatus('error'); setNotice(error.message || 'We could not send your inquiry right now. Please try again later.');
    }
  };

  return <section className="section contact" id="contact"><div className="container contact-card">
    <div><p className="eyebrow light"><span /> GET IN TOUCH</p><h2>Let&apos;s turn your plans<br /><em>into progress.</em></h2><p>Tell us what you are working on or ask us anything about Terigent. We will get back to you as soon as we can.</p></div>
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-fields">
        <Field label="Name" name="name" value={form.name} error={errors.name} onChange={update} autoComplete="name" maxLength={LIMITS.name} />
        <Field label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={update} autoComplete="email" maxLength={LIMITS.email} />
        <Field label="Subject" name="subject" value={form.subject} error={errors.subject} onChange={update} maxLength={LIMITS.subject} wide />
        <div className="contact-field full"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" rows="5" value={form.message} onChange={update} maxLength={LIMITS.message} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error' : undefined} />{errors.message && <span className="field-error" id="message-error">{errors.message}</span>}</div>
        <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex="-1" autoComplete="off" value={form.website} onChange={update} /></div>
      </div>
      <div className="contact-submit"><button className="button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending...' : <>Send inquiry <HiArrowRight /></>}</button><small>We only use your details to respond to this inquiry.</small></div>
      {notice && <div className={`form-notice ${status}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'success' && <HiCheck />}<span>{notice}</span></div>}
    </form>
  </div></section>;
}

function Field({ label, name, type = 'text', value, error, onChange, wide = false, ...props }) {
  const errorId = `${name}-error`;
  return <div className={`contact-field${wide ? ' full' : ''}`}><label htmlFor={`contact-${name}`}>{label}</label><input id={`contact-${name}`} name={name} type={type} value={value} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} />{error && <span className="field-error" id={errorId}>{error}</span>}</div>;
}
