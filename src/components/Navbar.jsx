import { useEffect, useState } from 'react';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import Logo from './Logo';

const links = [['Features', '#features'], ['Services', '#services'], ['How it works', '#how-it-works'], ['Benefits', '#benefits'], ['Request help', '#contact']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  useEffect(() => { let active = true; Promise.all([
    fetch('/api/auth/me').then(response => response.ok ? response.json() : null).catch(() => null),
    fetch('/api/admin/auth/session').then(response => response.ok ? response.json() : null).catch(() => null),
  ]).then(([memberPayload, adminPayload]) => { if (!active) return; setMember(memberPayload?.user || false); setAdminRole(adminPayload?.authenticated ? adminPayload.role : false); }); return () => { active = false; }; }, []);
  const logout = async () => { await Promise.allSettled([fetch('/api/auth/logout', { method: 'POST' }), fetch('/api/admin/auth/logout', { method: 'POST' })]); window.location.reload(); };
  const ready = member !== null && adminRole !== null;
  const administrator = adminRole === 'root' || adminRole === 'staff';
  return <header className="navbar" id="top">
    <div className="container nav-inner">
      <Logo />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <HiOutlineXMark /> : <HiOutlineBars3 />}</button>
      <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        {ready && administrator && <><a className="button button-small" href="/admin" onClick={() => setOpen(false)}>Company Management</a><button className="nav-logout" onClick={logout}>Logout</button></>}
        {ready && !administrator && member && <><a href="/dashboard">Customer Dashboard</a><a href="/account">My Account</a><button className="nav-logout" onClick={logout}>Logout</button></>}
        {ready && !administrator && !member && <a className="button button-small" href="/register" onClick={() => setOpen(false)}>Get started</a>}
      </nav>
    </div>
  </header>;
}
