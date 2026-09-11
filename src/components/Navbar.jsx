import { useState } from 'react';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import Logo from './Logo';

const links = [['Features', '#features'], ['How it works', '#how-it-works'], ['Task board', '#task-board'], ['Benefits', '#benefits']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="navbar" id="top">
    <div className="container nav-inner">
      <Logo />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <HiOutlineXMark /> : <HiOutlineBars3 />}</button>
      <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        <a className="button button-small" href="#task-board" onClick={() => setOpen(false)}>Try the board</a>
      </nav>
    </div>
  </header>;
}
