import { useEffect, useState } from 'react';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import Logo from './Logo';

const links = [['Features', '#features'], ['How it works', '#how-it-works'], ['Task board', '#task-board'], ['Benefits', '#benefits']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(null);
  useEffect(() => { fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(payload => setMember(payload?.user || false)).catch(() => setMember(false)); }, []);
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload(); };
  return <header className="navbar" id="top">
    <div className="container nav-inner">
      <Logo />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <HiOutlineXMark /> : <HiOutlineBars3 />}</button>
      <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        {member ? <><a href="/account">My Account</a><button className="nav-logout" onClick={logout}>Logout</button></> : member === false ? <><a href="/register">Register</a><a href="/login">Login</a></> : <span className="nav-auth-loading" role="status">Loading...</span>}
        <a className="button button-small" href="#task-board" onClick={() => setOpen(false)}>Try the board</a>
      </nav>
    </div>
  </header>;
}
