import { useEffect, useState } from 'react';
import Header from './components/layout/Header/Header';
import Footer from './components/layout/Footer/Footer';
import ApplicationFlow from './components/application/ApplicationFlow/ApplicationFlow';
import HomePage from './pages/Home/HomePage';
import { navigateToAnchor } from './utils/scroll';

export default function App() {
  const [applicationOpen, setApplicationOpen] = useState(false);
  useEffect(() => {
    const onAnchorClick = (event) => {
      const anchor = event.target instanceof Element
        ? event.target.closest('a[href^="#"]') : null;
      if (!anchor || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = anchor.getAttribute('href').slice(1);
      if (!target) return;
      if (navigateToAnchor(target)) {
        event.preventDefault();
        window.history.replaceState(window.history.state, '',
          window.location.pathname + window.location.search);
      }
    };
    document.addEventListener('click', onAnchorClick);
    const initialAnchor = decodeURIComponent(window.location.hash.slice(1));
    let frame;
    if (initialAnchor) {
      frame = requestAnimationFrame(() => {
        if (navigateToAnchor(initialAnchor)) {
          window.history.replaceState(window.history.state, '',
            window.location.pathname + window.location.search);
        }
      });
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('click', onAnchorClick);
    };
  }, []);
  return (
    <>
      <Header onApply={() => setApplicationOpen(true)} />
      <HomePage onApply={() => setApplicationOpen(true)} />
      <Footer />
      <ApplicationFlow open={applicationOpen} onClose={() => setApplicationOpen(false)} />
    </>
  );
}
