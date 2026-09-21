import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import Logo from './Logo';

const EMPTY_ANNOUNCEMENT = { title: '', content: '' };
const EMPTY_SERVICE = { name: '', description: '', category: '', pricingText: '', active: true };
const LIMITS = { title: 100, content: 5000, name: 120, description: 2000, category: 80, pricingText: 120 };
const cleanState = { sending: false, errors: {}, notice: '', success: false };

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload.error || 'The request failed.'); error.status = response.status; error.fields = payload.errors; throw error; }
  return payload;
}

function validate(form, fields) {
  const errors = {};
  for (const field of fields) {
    const value = form[field].trim();
    if (!value) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    else if (value.length > LIMITS[field]) errors[field] = `Maximum ${LIMITS[field]} characters.`;
  }
  if (form.pricingText?.trim().length > LIMITS.pricingText) errors.pricingText = `Maximum ${LIMITS.pricingText} characters.`;
  return errors;
}

export default function Admin() {
  const [auth, setAuth] = useState('checking');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginState, setLoginState] = useState({ sending: false, error: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [services, setServices] = useState([]);
  const [listState, setListState] = useState({ announcements: 'loading', services: 'loading' });
  const [announcementForm, setAnnouncementForm] = useState(EMPTY_ANNOUNCEMENT);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [announcementState, setAnnouncementState] = useState(cleanState);
  const [serviceState, setServiceState] = useState(cleanState);

  const load = useCallback(async () => {
    setListState({ announcements: 'loading', services: 'loading' });
    const [announcementResult, serviceResult] = await Promise.allSettled([api('/api/announcements'), api('/api/admin/services')]);
    const items = announcementResult.status === 'fulfilled' ? announcementResult.value.announcements || [] : [];
    setAnnouncements(items);
    setServices(serviceResult.status === 'fulfilled' ? serviceResult.value.services || [] : []);
    setListState({ announcements: announcementResult.status === 'fulfilled' ? 'ready' : 'error', services: serviceResult.status === 'fulfilled' ? 'ready' : 'error' });
    const requestedId = new URLSearchParams(window.location.search).get('edit');
    if (requestedId !== null) {
      window.history.replaceState(null, '', '/admin');
      const requested = items.find(item => item.id === requestedId);
      if (requested) { setEditingAnnouncement(requested.id); setAnnouncementForm({ title: requested.title, content: requested.content }); }
      else setAnnouncementState({ ...cleanState, notice: /^[1-9]\d*$/.test(requestedId) ? 'The requested announcement was not found. It may have been deleted.' : 'The requested announcement ID is invalid.' });
    }
  }, []);
  useEffect(() => { api('/api/admin/auth/session').then(result => { setAuth(result.authenticated ? 'authenticated' : 'anonymous'); if (result.authenticated) load(); }).catch(() => setAuth('anonymous')); }, [load]);

  const submitLogin = async event => {
    event.preventDefault(); setLoginState({ sending: true, error: '' });
    try { await api('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(login) }); setLogin({ username: '', password: '' }); setAuth('authenticated'); await load(); setLoginState({ sending: false, error: '' }); }
    catch (error) { setLoginState({ sending: false, error: error.message }); }
  };
  const logout = async () => { try { await api('/api/admin/auth/logout', { method: 'POST' }); } finally { setAuth('anonymous'); setAnnouncements([]); setServices([]); } };

  const submitAnnouncement = async event => {
    event.preventDefault(); const errors = validate(announcementForm, ['title', 'content']);
    if (Object.keys(errors).length) return setAnnouncementState({ ...cleanState, errors, notice: 'Please correct the highlighted fields.' });
    setAnnouncementState({ ...cleanState, sending: true });
    try {
      await api(editingAnnouncement ? `/api/announcements/${editingAnnouncement}` : '/api/announcements', { method: editingAnnouncement ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(announcementForm) });
      setAnnouncementForm(EMPTY_ANNOUNCEMENT); setEditingAnnouncement(null); setAnnouncementState({ ...cleanState, notice: 'Announcement saved.', success: true }); await load();
    } catch (error) { if (error.status === 401) setAuth('anonymous'); setAnnouncementState({ ...cleanState, errors: error.fields || {}, notice: error.message }); }
  };
  const submitService = async event => {
    event.preventDefault(); const errors = validate(serviceForm, ['name', 'description', 'category']);
    if (Object.keys(errors).length) return setServiceState({ ...cleanState, errors, notice: 'Please correct the highlighted fields.' });
    setServiceState({ ...cleanState, sending: true });
    try {
      await api(editingService ? `/api/admin/services/${editingService}` : '/api/admin/services', { method: editingService ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serviceForm) });
      setServiceForm(EMPTY_SERVICE); setEditingService(null); setServiceState({ ...cleanState, notice: 'Service saved.', success: true }); await load();
    } catch (error) { if (error.status === 401) setAuth('anonymous'); setServiceState({ ...cleanState, errors: error.fields || {}, notice: error.message }); }
  };
  const remove = async (kind, item) => {
    if (!window.confirm(`Delete “${kind === 'service' ? item.name : item.title}”? This cannot be undone.`)) return;
    try {
      await api(kind === 'service' ? `/api/admin/services/${item.id}` : `/api/announcements/${item.id}`, { method: 'DELETE' });
      if (kind === 'service' && editingService === item.id) { setEditingService(null); setServiceForm(EMPTY_SERVICE); }
      if (kind === 'announcement' && editingAnnouncement === item.id) { setEditingAnnouncement(null); setAnnouncementForm(EMPTY_ANNOUNCEMENT); }
      await load();
    } catch (error) { if (error.status === 401) setAuth('anonymous'); else window.alert(error.message); }
  };

  if (auth === 'checking') return <main className="admin-shell"><p role="status">Checking administrator session...</p></main>;
  if (auth === 'anonymous') return <main className="admin-shell"><div className="admin-login"><Logo /><a href="/#services" className="admin-back"><HiOutlineArrowLeft /> Back to website</a><h1>Administrator sign in</h1><p>Sign in to manage company services and announcements.</p><form onSubmit={submitLogin}>
    <label>Username<input autoComplete="username" value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required /></label>
    {loginState.error && <p className="admin-notice error" role="alert">{loginState.error}</p>}<button className="button" disabled={loginState.sending}>{loginState.sending ? 'Signing in...' : 'Sign in'}</button>
  </form></div></main>;

  const editAnnouncement = item => { setEditingAnnouncement(item.id); setAnnouncementForm({ title: item.title, content: item.content }); setAnnouncementState(cleanState); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const editService = item => { setEditingService(item.id); setServiceForm({ name: item.name, description: item.description, category: item.category, pricingText: item.pricingText || '', active: item.active }); setServiceState(cleanState); document.querySelector('#service-editor')?.scrollIntoView({ behavior: 'smooth' }); };

  return <main className="admin-shell"><div className="admin-page"><header className="admin-header"><div><Logo /><h1>Content management</h1></div><div><a className="button button-ghost button-small" href="/#services"><HiOutlineArrowLeft /> Back to website</a><button className="button button-small" onClick={logout}>Sign out</button></div></header>
    <section className="admin-panel" id="service-editor"><h2>{editingService ? 'Edit service' : 'New service'}</h2><form className="admin-form service-form" onSubmit={submitService} noValidate>
      <label>Name <span>{serviceForm.name.length}/{LIMITS.name}</span><input value={serviceForm.name} maxLength={LIMITS.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} aria-invalid={Boolean(serviceState.errors.name)} />{serviceState.errors.name && <small>{serviceState.errors.name}</small>}</label>
      <label>Category <span>{serviceForm.category.length}/{LIMITS.category}</span><input value={serviceForm.category} maxLength={LIMITS.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} aria-invalid={Boolean(serviceState.errors.category)} />{serviceState.errors.category && <small>{serviceState.errors.category}</small>}</label>
      <label>Description <span>{serviceForm.description.length}/{LIMITS.description}</span><textarea rows="5" value={serviceForm.description} maxLength={LIMITS.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} aria-invalid={Boolean(serviceState.errors.description)} />{serviceState.errors.description && <small>{serviceState.errors.description}</small>}</label>
      <label>Pricing text (optional) <span>{serviceForm.pricingText.length}/{LIMITS.pricingText}</span><input value={serviceForm.pricingText} maxLength={LIMITS.pricingText} placeholder="e.g. From $99/month" onChange={e => setServiceForm({ ...serviceForm, pricingText: e.target.value })} aria-invalid={Boolean(serviceState.errors.pricingText)} />{serviceState.errors.pricingText && <small>{serviceState.errors.pricingText}</small>}</label>
      <label className="admin-check"><input type="checkbox" checked={serviceForm.active} onChange={e => setServiceForm({ ...serviceForm, active: e.target.checked })} /> Available on the public website</label>
      {serviceState.notice && <p className={`admin-notice ${serviceState.success ? 'success' : 'error'}`} role="status">{serviceState.notice}</p>}<div className="admin-form-actions">{editingService && <button type="button" className="button button-ghost" onClick={() => { setEditingService(null); setServiceForm(EMPTY_SERVICE); setServiceState(cleanState); }} disabled={serviceState.sending}>Cancel</button>}<button className="button" disabled={serviceState.sending}><HiOutlinePlus /> {serviceState.sending ? 'Saving...' : editingService ? 'Save changes' : 'Create service'}</button></div>
    </form></section>
    <section className="admin-panel"><h2>Company services</h2>{listState.services === 'loading' && <p role="status">Loading services...</p>}{listState.services === 'error' && <p className="admin-notice error">Services could not be loaded. <button onClick={load}>Try again</button></p>}{listState.services === 'ready' && !services.length && <p>No services yet.</p>}
      <div className="admin-list">{services.map(item => <article key={item.id}><div><div className="admin-item-heading"><h3>{item.name}</h3><span className={item.active ? 'status-active' : 'status-inactive'}>{item.active ? 'Public' : 'Hidden'}</span></div><small>{item.category}{item.pricingText ? ` · ${item.pricingText}` : ''}</small><p>{item.description}</p></div><div><button className="button button-ghost button-small" onClick={() => editService(item)}><HiOutlinePencilSquare /> Edit</button><button className="button button-danger button-small" onClick={() => remove('service', item)}><HiOutlineTrash /> Delete</button></div></article>)}</div>
    </section>
    <section className="admin-panel"><h2>{editingAnnouncement ? 'Edit announcement' : 'New announcement'}</h2><form className="admin-form announcement-form" onSubmit={submitAnnouncement} noValidate>
      <label>Title <span>{announcementForm.title.length}/{LIMITS.title}</span><input value={announcementForm.title} maxLength={LIMITS.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} aria-invalid={Boolean(announcementState.errors.title)} />{announcementState.errors.title && <small>{announcementState.errors.title}</small>}</label>
      <label>Content <span>{announcementForm.content.length}/{LIMITS.content}</span><textarea rows="7" value={announcementForm.content} maxLength={LIMITS.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} aria-invalid={Boolean(announcementState.errors.content)} />{announcementState.errors.content && <small>{announcementState.errors.content}</small>}</label>
      {announcementState.notice && <p className={`admin-notice ${announcementState.success ? 'success' : 'error'}`} role="status">{announcementState.notice}</p>}<div className="admin-form-actions">{editingAnnouncement && <button type="button" className="button button-ghost" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm(EMPTY_ANNOUNCEMENT); setAnnouncementState(cleanState); }} disabled={announcementState.sending}>Cancel</button>}<button className="button" disabled={announcementState.sending}><HiOutlinePlus /> {announcementState.sending ? 'Saving...' : editingAnnouncement ? 'Save changes' : 'Publish announcement'}</button></div>
    </form></section>
    <section className="admin-panel"><h2>Existing announcements</h2>{listState.announcements === 'loading' && <p role="status">Loading announcements...</p>}{listState.announcements === 'error' && <p className="admin-notice error">Announcements could not be loaded. <button onClick={load}>Try again</button></p>}{listState.announcements === 'ready' && !announcements.length && <p>No announcements yet.</p>}
      <div className="admin-list">{announcements.map(item => <article key={item.id}><div><h3>{item.title}</h3><p>{item.content}</p></div><div><button className="button button-ghost button-small" onClick={() => editAnnouncement(item)}><HiOutlinePencilSquare /> Edit</button><button className="button button-danger button-small" onClick={() => remove('announcement', item)}><HiOutlineTrash /> Delete</button></div></article>)}</div>
    </section>
  </div></main>;
}
