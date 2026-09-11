import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowPath, HiOutlineMegaphone } from 'react-icons/hi2';

const formatDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function Announcements() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const load = useCallback(async () => {
    setState(current => ({ ...current, status: 'loading' }));
    try {
      const response = await fetch('/api/announcements');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Announcements could not be loaded.');
      setState({ status: 'ready', items: payload.announcements || [] });
    } catch (error) { setState({ status: 'error', items: [], error: error.message }); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/announcements').then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Announcements could not be loaded.');
      if (active) setState({ status: 'ready', items: payload.announcements || [] });
    }).catch(error => { if (active) setState({ status: 'error', items: [], error: error.message }); });
    return () => { active = false; };
  }, []);

  return <section className="section announcements-section" id="announcements"><div className="container">
    <div className="section-heading"><p className="eyebrow"><span /> LATEST UPDATES</p><h2>Company<br /><em>announcements.</em></h2><p>News and updates from the Terigent team.</p></div>
    {state.status === 'loading' && <p className="announcement-state" role="status">Loading announcements...</p>}
    {state.status === 'error' && <div className="announcement-state error" role="alert"><span>{state.error}</span><button className="button button-ghost button-small" onClick={load}><HiOutlineArrowPath /> Try again</button></div>}
    {state.status === 'ready' && !state.items.length && <p className="announcement-state">No announcements yet.</p>}
    {state.status === 'ready' && state.items.length > 0 && <div className="announcement-list">{state.items.map(item => <article className="announcement-card" key={item.id}>
      <HiOutlineMegaphone className="announcement-icon" /><div><h3>{item.title}</h3><p className="announcement-content">{item.content}</p><p className="announcement-time">Published <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{item.updatedAt !== item.createdAt && <> · Updated <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></>}</p></div>
    </article>)}</div>}
  </div></section>;
}
