import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import TaskBoard from './components/TaskBoard';
import Benefits from './components/Benefits';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Announcements from './components/Announcements';
import Admin from './components/Admin';
import { Account, AuthPage } from './components/MemberAuth';

export default function App() {
  if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return <Admin />;
  if (/^\/register\/?$/.test(window.location.pathname)) return <AuthPage mode="register" />;
  if (/^\/login\/?$/.test(window.location.pathname)) return <AuthPage mode="login" />;
  if (/^\/account\/?$/.test(window.location.pathname)) return <Account />;
  return <>
    <Announcements />
    <Navbar />
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <TaskBoard />
      <Benefits />
      <Contact />
    </main>
    <Footer />
  </>;
}
