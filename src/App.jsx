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

export default function App() {
  if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return <Admin />;
  return <>
    <Navbar />
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <TaskBoard />
      <Announcements />
      <Benefits />
      <Contact />
    </main>
    <Footer />
  </>;
}
