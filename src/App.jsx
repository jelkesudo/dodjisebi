import { useEffect, useState } from 'react';
import Header from './components/layout/Header/Header';
import Footer from './components/layout/Footer/Footer';
import ApplicationFlow from './components/application/ApplicationFlow/ApplicationFlow';
import HomePage from './pages/Home/HomePage';
import AuthPage from './pages/Client/Auth/AuthPage';
import DashboardPage from './pages/Client/Dashboard/DashboardPage';
import SettingsPage from './pages/Client/Settings/SettingsPage';
import OffersPage from './pages/Client/Offers/OffersPage';
import ResetPasswordPage from './pages/Client/ResetPassword/ResetPasswordPage';
import { navigateToAnchor } from './utils/scroll';
import { getStoredSession, storeSession } from './services/supabase/supabaseClient';

function currentPath() { return window.location.pathname.replace(/\/$/, '') || '/'; }

export default function App() {
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [path, setPath] = useState(currentPath());
  const [session, setSession] = useState(getStoredSession());

  useEffect(() => {
    const sync = () => { setPath(currentPath()); setSession(getStoredSession()); window.scrollTo(0, 0); };
    window.addEventListener('popstate', sync);
    window.addEventListener('dodji-sebi-auth-change', sync);

    // Supabase password-recovery / confirmation links may return a session in the URL hash.
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('access_token') && params.get('refresh_token')) {
      const next = {
        access_token: params.get('access_token'), refresh_token: params.get('refresh_token'),
        token_type: params.get('token_type') || 'bearer', expires_in: Number(params.get('expires_in') || 3600),
        expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
        user: session?.user || null,
      };
      storeSession(next);
      const authType = params.get('type');
      window.history.replaceState({}, '', authType === 'recovery' ? '/reset-lozinke' : '/nalog');
      sync();
    }
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('dodji-sebi-auth-change', sync); };
  }, []);

  useEffect(() => {
    if (path !== '/') return;
    const onAnchorClick = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = anchor.getAttribute('href').slice(1); if (!target) return;
      if (navigateToAnchor(target)) { event.preventDefault(); window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); }
    };
    document.addEventListener('click', onAnchorClick);
    return () => document.removeEventListener('click', onAnchorClick);
  }, [path]);

  if (path === '/prijava') return <AuthPage />;
  if (path === '/reset-lozinke') return <ResetPasswordPage />;
  if (path.startsWith('/nalog') && !session?.access_token) return <AuthPage />;
  if (path === '/nalog/podesavanja') return <SettingsPage />;
  if (path === '/nalog/ponuda') return <OffersPage />;
  if (path.startsWith('/nalog')) return <DashboardPage />;

  return <>
    <Header onApply={() => setApplicationOpen(true)} />
    <HomePage onApply={() => setApplicationOpen(true)} />
    <Footer />
    <ApplicationFlow open={applicationOpen} onClose={() => setApplicationOpen(false)} onLogin={() => { window.history.pushState({}, '', '/prijava'); window.dispatchEvent(new PopStateEvent('popstate')); }} />
  </>;
}
