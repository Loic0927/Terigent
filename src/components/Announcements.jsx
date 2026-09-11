import { useCallback, useEffect, useState } from 'react';
import { HiChevronDown, HiOutlineArrowPath, HiOutlineMegaphone, HiOutlineXMark } from 'react-icons/hi2';

const formatDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function Announcements() {
  const [state, setState] = useState({ status: 'loading', item: null });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setState(current => ({ ...current, status: 'loading' }));
    try {
      const response = await fetch('/api/announcements');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Announcements could not be loaded.');
      setState({ status: 'ready', item: payload.announcements?.[0] || null });
    } catch (error) { setState({ status: 'error', item: null, error: error.message }); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/announcements').then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Announcements could not be loaded.');
      if (active) setState({ status: 'ready', item: payload.announcements?.[0] || null });
    }).catch(error => { if (active) setState({ status: 'error', item: null, error: error.message }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return <aside className="announcement-pin" id="announcements" aria-label="Latest announcement">
    <div className="announcement-pin-inner">
      <HiOutlineMegaphone aria-hidden="true" />
      {state.status === 'loading' && <span role="status">Loading latest announcement...</span>}
      {state.status === 'error' && <><span>Announcement unavailable.</span><button className="announcement-retry" onClick={load}><HiOutlineArrowPath /> Retry</button></>}
      {state.status === 'ready' && !state.item && <span>No announcements yet.</span>}
      {state.status === 'ready' && state.item && <button className="announcement-pin-trigger" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-controls="announcement-details">
        <strong>Announcement</strong><span>{state.item.title}</span><HiChevronDown className={open ? 'rotated' : ''} aria-hidden="true" />
      </button>}
    </div>
    {open && state.item && <div className="announcement-popover" id="announcement-details">
      <div className="announcement-popover-heading"><div><span>Latest announcement</span><h2>{state.item.title}</h2></div><button onClick={() => setOpen(false)} aria-label="Close announcement"><HiOutlineXMark /></button></div>
      <p className="announcement-content">{state.item.content}</p>
      <p className="announcement-time">Published <time dateTime={state.item.createdAt}>{formatDate(state.item.createdAt)}</time>{state.item.updatedAt !== state.item.createdAt && <> · Updated <time dateTime={state.item.updatedAt}>{formatDate(state.item.updatedAt)}</time></>}</p>
    </div>}
  </aside>;
}
