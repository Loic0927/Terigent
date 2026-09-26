import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowPath, HiOutlineMagnifyingGlass, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';

async function requestServices(filters, signal) {
  const parameters = new URLSearchParams({ sort: filters.sort, page: String(filters.page) });
  if (filters.q.trim()) parameters.set('q', filters.q.trim());
  if (filters.category) parameters.set('category', filters.category);
  const response = await fetch(`/api/services?${parameters}`, { cache: 'no-store', signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Services could not be loaded.');
  return payload;
}

export default function Services() {
  const [filters, setFilters] = useState({ q: '', category: '', sort: 'updated_desc', page: 1 });
  const [state, setState] = useState({ status: 'loading', items: [], categories: [], pagination: null, error: '' });
  const load = useCallback(async () => {
    setState(current => ({ ...current, status: 'loading', error: '' }));
    try {
      const payload = await requestServices(filters);
      setState({ status: 'ready', items: payload.services || [], categories: payload.filters?.categories || [], pagination: payload.pagination || null, error: '' });
    } catch (error) { setState(current => ({ ...current, status: 'error', items: [], error: error.message })); }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState(current => ({ ...current, status: 'loading', error: '' }));
      requestServices(filters, controller.signal)
        .then(payload => setState({ status: 'ready', items: payload.services || [], categories: payload.filters?.categories || [], pagination: payload.pagination || null, error: '' }))
        .catch(error => { if (error.name !== 'AbortError') setState(current => ({ ...current, status: 'error', items: [], error: error.message })); });
    }, filters.q ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters]);

  const setFilter = (name, value) => setFilters(current => ({ ...current, [name]: value, page: 1 }));
  const clear = () => setFilters({ q: '', category: '', sort: 'updated_desc', page: 1 });
  const hasFilters = Boolean(filters.q || filters.category || filters.sort !== 'updated_desc');

  return <section className="section services" id="services"><div className="container">
    <div className="section-heading centered"><p className="eyebrow"><span /> OUR SERVICES</p><h2>Support shaped around<br /><em>the work that matters.</em></h2><p>Explore the services currently available from our team.</p></div>
    <form className="service-search" onSubmit={event => event.preventDefault()} role="search">
      <label className="service-query"><span>Search services</span><span className="service-query-input"><HiOutlineMagnifyingGlass /><input type="search" value={filters.q} maxLength="100" placeholder="Search name, description, category or pricing" onChange={event => setFilter('q', event.target.value)} /></span></label>
      <label><span>Category</span><select value={filters.category} onChange={event => setFilter('category', event.target.value)}><option value="">All categories</option>{state.categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
      <label><span>Updated</span><select value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="updated_desc">Newest first</option><option value="updated_asc">Oldest first</option></select></label>
      {hasFilters && <button type="button" className="service-clear" onClick={clear}><HiOutlineXMark /> Clear</button>}
    </form>
    {state.status === 'loading' && <p className="services-state" role="status">Searching services...</p>}
    {state.status === 'error' && <div className="services-state error" role="alert"><p>{state.error}</p><button className="button button-ghost button-small" onClick={load}><HiOutlineArrowPath /> Try again</button></div>}
    {state.status === 'ready' && !state.items.length && <div className="services-state"><p>No services match these search filters.</p>{hasFilters && <button type="button" className="button button-ghost button-small" onClick={clear}>Clear filters</button>}</div>}
    {state.status === 'ready' && state.pagination && <p className="service-result-count" aria-live="polite">{state.pagination.total} {state.pagination.total === 1 ? 'service' : 'services'} found</p>}
    {state.status === 'ready' && <div className="service-grid">{state.items.map(item => <article className="service-card" key={item.id}><span className="service-icon"><HiOutlineSparkles /></span><p className="service-category">{item.category}</p><h3>{item.name}</h3><p className="service-description">{item.description}</p>{item.pricingText && <p className="service-price">{item.pricingText}</p>}<p className="service-updated">Updated {new Date(item.updatedAt).toLocaleDateString()}</p>{item.matches?.length > 0 && <div className="service-matches"><strong>Why this matched</strong>{item.matches.map(match => <p key={match.field}><span>{match.field}</span> {match.snippet}</p>)}</div>}</article>)}</div>}
    {state.status === 'ready' && state.pagination?.totalPages > 1 && <nav className="service-pagination" aria-label="Service results pages"><button className="button button-ghost button-small" disabled={filters.page <= 1} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}>Previous</button><span>Page {filters.page} of {state.pagination.totalPages}</span><button className="button button-ghost button-small" disabled={filters.page >= state.pagination.totalPages} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>Next</button></nav>}
  </div></section>;
}
