import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import TaskBoard from './components/TaskBoard';
import Benefits from './components/Benefits';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Announcements from './components/Announcements';
import Services from './components/Services';
import Admin from './components/Admin';
import { Account, AuthPage } from './components/MemberAuth';
import MemberLayout from './components/MemberLayout';
import ProjectManagement from './components/ProjectManagement';
import NotificationCenter from './components/NotificationCenter';

export default function App() {
  let content;
  if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') content = <Admin />;
  else if (/^\/register\/?$/.test(window.location.pathname)) content = <AuthPage mode="register" />;
  else if (/^\/login\/?$/.test(window.location.pathname)) content = <AuthPage mode="login" />;
  else if (/^\/account\/?$/.test(window.location.pathname)) content = <Account />;
  else if (/^\/dashboard\/?$/.test(window.location.pathname)) content = <MemberLayout active="dashboard">{user => <TaskBoard user={user} />}</MemberLayout>;
  else if (/^\/projects\/?$/.test(window.location.pathname)) content = <ProjectManagement />;
  else content = <>
    <Announcements />
    <Navbar />
    <main>
      <Hero />
      <Features />
      <Services />
      <HowItWorks />
      <Benefits />
      <Contact />
    </main>
    <Footer />
  </>;
  return <><NotificationCenter />{content}</>;
}
