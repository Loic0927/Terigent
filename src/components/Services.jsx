import { useCallback, useEffect, useState } from 'react';
import { HiOutlineArrowPath, HiOutlineSparkles } from 'react-icons/hi2';

async function requestServices() {
  const response = await fetch('/api/services', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Services could not be loaded.');
  return payload.services || [];
}

export default function Services() {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });
  const load = useCallback(async () => {
    setState({ status: 'loading', items: [], error: '' });
    try {
      setState({ status: 'ready', items: await requestServices(), error: '' });
    } catch (error) { setState({ status: 'error', items: [], error: error.message }); }
  }, []);
  useEffect(() => {
    let active = true;
    requestServices().then(items => { if (active) setState({ status: 'ready', items, error: '' }); }).catch(error => { if (active) setState({ status: 'error', items: [], error: error.message }); });
    return () => { active = false; };
  }, []);

  return <section className="section services" id="services"><div className="container">
    <div className="section-heading centered"><p className="eyebrow"><span /> OUR SERVICES</p><h2>Support shaped around<br /><em>the work that matters.</em></h2><p>Explore the services currently available from our team.</p></div>
    {state.status === 'loading' && <p className="services-state" role="status">Loading services...</p>}
    {state.status === 'error' && <div className="services-state error" role="alert"><p>{state.error}</p><button className="button button-ghost button-small" onClick={load}><HiOutlineArrowPath /> Try again</button></div>}
    {state.status === 'ready' && !state.items.length && <p className="services-state">No services are currently available. Please check back soon.</p>}
    {state.status === 'ready' && <div className="service-grid">{state.items.map(item => <article className="service-card" key={item.id}><span className="service-icon"><HiOutlineSparkles /></span><p className="service-category">{item.category}</p><h3>{item.name}</h3><p className="service-description">{item.description}</p>{item.pricingText && <p className="service-price">{item.pricingText}</p>}</article>)}</div>}
  </div></section>;
}
