import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import Logo from './Logo';

const EMPTY = { title: '', content: '' };
const LIMITS = { title: 100, content: 5000 };

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload.error || 'The request failed.'); error.status = response.status; error.fields = payload.errors; throw error; }
  return payload;
}

function validate(form) {
  const errors = {};
  for (const field of ['title', 'content']) {
    const value = form[field].trim();
    if (!value) errors[field] = `${field === 'title' ? 'Title' : 'Content'} is required.`;
    else if (value.length > LIMITS[field]) errors[field] = `Maximum ${LIMITS[field]} characters.`;
  }
  return errors;
}

export default function Admin() {
  const [auth, setAuth] = useState('checking');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginState, setLoginState] = useState({ sending: false, error: '' });
  const [items, setItems] = useState([]);
  const [listState, setListState] = useState('loading');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [formState, setFormState] = useState({ sending: false, errors: {}, notice: '', success: false });

  const load = useCallback(async () => {
    setListState('loading');
    try {
      const payload = await api('/api/announcements');
      const announcements = payload.announcements || [];
      setItems(announcements); setListState('ready');
      const requestedId = new URLSearchParams(window.location.search).get('edit');
      if (requestedId !== null) {
        window.history.replaceState(null, '', '/admin');
        if (!/^[1-9]\d*$/.test(requestedId)) {
          setEditing(null); setForm(EMPTY); setFormState({ sending: false, errors: {}, notice: 'The requested announcement ID is invalid. You can choose an announcement from the list below.', success: false });
        } else {
          const requested = announcements.find(item => item.id === requestedId);
          if (requested) {
            setEditing(requested.id); setForm({ title: requested.title, content: requested.content }); setFormState({ sending: false, errors: {}, notice: '', success: false });
          } else {
            setEditing(null); setForm(EMPTY); setFormState({ sending: false, errors: {}, notice: 'The requested announcement was not found. It may have been deleted.', success: false });
          }
        }
      }
    }
    catch { setListState('error'); }
  }, []);
  useEffect(() => { api('/api/admin/auth/session').then(result => { setAuth(result.authenticated ? 'authenticated' : 'anonymous'); if (result.authenticated) load(); }).catch(() => setAuth('anonymous')); }, [load]);

  const submitLogin = async event => {
    event.preventDefault(); setLoginState({ sending: true, error: '' });
    try { await api('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(login) }); setLogin({ username: '', password: '' }); setAuth('authenticated'); await load(); setLoginState({ sending: false, error: '' }); }
    catch (error) { setLoginState({ sending: false, error: error.message }); }
  };
  const logout = async () => { try { await api('/api/admin/auth/logout', { method: 'POST' }); } finally { setAuth('anonymous'); setItems([]); setForm(EMPTY); setEditing(null); } };
  const beginEdit = item => { setEditing(item.id); setForm({ title: item.title, content: item.content }); setFormState({ sending: false, errors: {}, notice: '', success: false }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setFormState({ sending: false, errors: {}, notice: '', success: false }); };

  const submitAnnouncement = async event => {
    event.preventDefault(); const errors = validate(form);
    if (Object.keys(errors).length) return setFormState({ sending: false, errors, notice: 'Please correct the highlighted fields.', success: false });
    setFormState({ sending: true, errors: {}, notice: '', success: false });
    try {
      await api(editing ? `/api/announcements/${editing}` : '/api/announcements', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm(EMPTY); setEditing(null); setFormState({ sending: false, errors: {}, notice: 'Announcement saved.', success: true }); await load();
    } catch (error) { if (error.status === 401) setAuth('anonymous'); setFormState({ sending: false, errors: error.fields || {}, notice: error.message, success: false }); }
  };
  const remove = async item => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try { await api(`/api/announcements/${item.id}`, { method: 'DELETE' }); if (editing === item.id) cancelEdit(); await load(); }
    catch (error) { if (error.status === 401) setAuth('anonymous'); else window.alert(error.message); }
  };

  if (auth === 'checking') return <main className="admin-shell"><p role="status">Checking administrator session...</p></main>;
  if (auth === 'anonymous') return <main className="admin-shell"><div className="admin-login"><Logo /><a href="/?openAnnouncements=1#announcements" className="admin-back"><HiOutlineArrowLeft /> Back to announcements</a><h1>Administrator sign in</h1><p>Sign in to manage public announcements.</p><form onSubmit={submitLogin}>
    <label>Username<input autoComplete="username" value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required /></label>
    {loginState.error && <p className="admin-notice error" role="alert">{loginState.error}</p>}<button className="button" disabled={loginState.sending}>{loginState.sending ? 'Signing in...' : 'Sign in'}</button>
  </form></div></main>;

  return <main className="admin-shell"><div className="admin-page"><header className="admin-header"><div><Logo /><h1>Announcement management</h1></div><div><a className="button button-ghost button-small" href="/?openAnnouncements=1#announcements"><HiOutlineArrowLeft /> Back to announcements</a><button className="button button-small" onClick={logout}>Sign out</button></div></header>
    <section className="admin-panel"><h2>{editing ? 'Edit announcement' : 'New announcement'}</h2><form className="admin-form" onSubmit={submitAnnouncement} noValidate>
      <label>Title <span>{form.title.length}/{LIMITS.title}</span><input value={form.title} maxLength={LIMITS.title} onChange={e => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(formState.errors.title)} />{formState.errors.title && <small>{formState.errors.title}</small>}</label>
      <label>Content <span>{form.content.length}/{LIMITS.content}</span><textarea rows="7" value={form.content} maxLength={LIMITS.content} onChange={e => setForm({ ...form, content: e.target.value })} aria-invalid={Boolean(formState.errors.content)} />{formState.errors.content && <small>{formState.errors.content}</small>}</label>
      {formState.notice && <p className={`admin-notice ${formState.success ? 'success' : 'error'}`} role="status">{formState.notice}</p>}<div className="admin-form-actions">{editing && <button type="button" className="button button-ghost" onClick={cancelEdit} disabled={formState.sending}>Cancel</button>}<button className="button" disabled={formState.sending}><HiOutlinePlus /> {formState.sending ? 'Saving...' : editing ? 'Save changes' : 'Publish announcement'}</button></div>
    </form></section>
    <section className="admin-panel"><h2>Existing announcements</h2>{listState === 'loading' && <p>Loading...</p>}{listState === 'error' && <p className="admin-notice error">Announcements could not be loaded. <button onClick={load}>Try again</button></p>}{listState === 'ready' && !items.length && <p>No announcements yet.</p>}
      <div className="admin-list">{items.map(item => <article key={item.id}><div><h3>{item.title}</h3><p>{item.content}</p></div><div><button className="button button-ghost button-small" onClick={() => beginEdit(item)}><HiOutlinePencilSquare /> Edit</button><button className="button button-danger button-small" onClick={() => remove(item)}><HiOutlineTrash /> Delete</button></div></article>)}</div>
    </section>
  </div></main>;
}
