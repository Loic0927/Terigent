import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import TaskBoard from './components/TaskBoard';
import Benefits from './components/Benefits';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return <>
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
