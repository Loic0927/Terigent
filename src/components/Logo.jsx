import { HiOutlineSparkles } from 'react-icons/hi2';

export default function Logo({href='#top'}) {
  return <a className="logo" href={href} aria-label="Terigent home">
    <span className="logo-mark"><HiOutlineSparkles /></span><span>terigent</span>
  </a>;
}
