import { useCallback, useEffect, useRef, useState } from 'react';
import { HiChevronDown, HiOutlineArrowPath, HiOutlineMegaphone, HiOutlinePencilSquare, HiOutlineWrenchScrewdriver, HiOutlineXMark } from 'react-icons/hi2';

const formatDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const shouldStartOpen = new URLSearchParams(window.location.search).get('openAnnouncements') === '1';

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

export default function Announcements() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(shouldStartOpen);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  const loadAnnouncements = useCallback(async () => {
    setState(current => current.items.length ? current : { status: 'loading', items: [] });
    try {
      const payload = await getJson('/api/announcements');
      setState({ status: 'ready', items: payload.announcements || [] });
    } catch (error) { setState({ status: 'error', items: [], error: error.message }); }
  }, []);

  const checkSession = useCallback(async () => {
    try { const payload = await getJson('/api/admin/auth/session'); setAuthenticated(Boolean(payload.authenticated)); }
    catch { setAuthenticated(false); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getJson('/api/announcements'), getJson('/api/admin/auth/session')]).then(([announcements, session]) => {
      if (!active) return;
      if (announcements.status === 'fulfilled') setState({ status: 'ready', items: announcements.value.announcements || [] });
      else setState({ status: 'error', items: [], error: announcements.reason.message });
      setAuthenticated(session.status === 'fulfilled' && Boolean(session.value.authenticated));
    });
    if (shouldStartOpen) window.history.replaceState(null, '', `${window.location.pathname}#announcements`);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refreshSession = () => { checkSession(); };
    window.addEventListener('focus', refreshSession);
    window.addEventListener('pageshow', refreshSession);
    return () => { window.removeEventListener('focus', refreshSession); window.removeEventListener('pageshow', refreshSession); };
  }, [checkSession]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const closeOnEscape = event => {
      if (event.key === 'Escape') { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) { loadAnnouncements(); checkSession(); }
  };
  const close = () => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const latest = state.items[0];

  return <aside className="announcement-pin" id="announcements" aria-label="Announcements">
    <div className="announcement-pin-inner">
      <HiOutlineMegaphone aria-hidden="true" />
      {state.status === 'loading' && <span role="status">Loading announcements...</span>}
      {state.status === 'error' && <><span>Announcements unavailable.</span><button className="announcement-retry" onClick={loadAnnouncements}><HiOutlineArrowPath /> Retry</button></>}
      {state.status === 'ready' && !latest && <button ref={triggerRef} className="announcement-pin-trigger" onClick={toggle} aria-expanded={open} aria-controls="announcement-details"><strong>Announcements</strong><span>No announcements yet</span><HiChevronDown className={open ? 'rotated' : ''} /></button>}
      {latest && <button ref={triggerRef} className="announcement-pin-trigger" onClick={toggle} aria-expanded={open} aria-controls="announcement-details">
        <strong>Announcements</strong><span>{latest.title}</span><b>{state.items.length}</b><HiChevronDown className={open ? 'rotated' : ''} aria-hidden="true" />
      </button>}
    </div>
    {open && <div className="announcement-popover" id="announcement-details" aria-label="All announcements">
      <div className="announcement-popover-heading"><div><span>Company updates</span><h2>Announcements <small>{state.items.length}</small></h2></div><div className="announcement-heading-actions">{authenticated && <a href="/admin"><HiOutlineWrenchScrewdriver /> Manage announcements</a>}<button ref={closeRef} onClick={close} aria-label="Close announcements"><HiOutlineXMark /></button></div></div>
      {state.status === 'loading' && !state.items.length && <p role="status">Loading announcements...</p>}
      {state.status === 'error' && <div className="announcement-panel-state" role="alert"><span>{state.error}</span><button className="announcement-retry" onClick={loadAnnouncements}><HiOutlineArrowPath /> Retry</button></div>}
      {state.status === 'ready' && !state.items.length && <p className="announcement-panel-state">No announcements yet.</p>}
      <div className="announcement-popover-list">{state.items.map(item => <article className="announcement-popover-card" key={item.id}>
        <div className="announcement-card-heading"><h3>{item.title}</h3>{authenticated && <a href={`/admin?edit=${encodeURIComponent(item.id)}`}><HiOutlinePencilSquare /> Edit</a>}</div>
        <p className="announcement-content">{item.content}</p>
        <p className="announcement-time">Published <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{item.updatedAt !== item.createdAt && <> · Updated <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></>}</p>
      </article>)}</div>
    </div>}
  </aside>;
}
