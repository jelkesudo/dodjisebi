import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../../../services/auth/authService';
import './AuthPage.css';
import { getErrorMessage } from '../../../services/errors/errorMessages';
import { ButtonSpinner } from '../../../components/ui/Feedback/Feedback';

function goHome() {
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setDevResetUrl('');
    setInfo('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'login') {
        await authService.signIn(form.email, form.password);
        window.history.replaceState({}, '', '/nalog');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        const result = await authService.sendPasswordReset(form.email);
        setDevResetUrl(result?.devResetUrl || '');
        setInfo(result?.devResetUrl
          ? 'Lokalni test: otvori link ispod za promenu lozinke.'
          : 'Ako nalog postoji, poslali smo link za promenu lozinke.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-page">
    <header className="auth-topbar">
      <button className="auth-home-link" type="button" onClick={goHome} aria-label="DOĐI SEBI — početna">
        <span className="auth-brand-mark" aria-hidden="true">✦</span>
        <span className="auth-brand-name">DOĐI SEBI</span>
      </button>
      <button className="auth-back-home" type="button" onClick={goHome}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Nazad na početnu</span>
      </button>
    </header>

    <main className="auth-card">
      <p className="kicker">MOJ NALOG</p>
      <h1>{mode === 'login' ? 'Dobrodošla.' : 'Zaboravljena lozinka.'}</h1>
      <form onSubmit={submit}>
        <label>Email<input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={update('email')} /></label>
        {mode === 'login' && <label>Lozinka<input type="password" required minLength={8} autoComplete="current-password" value={form.password} onChange={update('password')} /></label>}
        {error && <p className="client-error" role="alert">{error}</p>}
        {info && <p className="client-success">{info}</p>}
        {devResetUrl && <a className="client-btn" href={devResetUrl}>Otvori lokalni reset link</a>}
        <button className="client-btn" disabled={busy}>{busy && <ButtonSpinner/>}{busy ? 'Sačekaj...' : mode === 'login' ? 'Prijavi se' : 'Pošalji link'}</button>
      </form>
      <div className="auth-switch">
        {mode !== 'login' && <button type="button" onClick={() => switchMode('login')}>Imam nalog</button>}
        {mode !== 'reset' && <button type="button" onClick={() => switchMode('reset')}>Zaboravljena lozinka</button>}
      </div>
      {mode === 'login' && <p className="auth-note">Nemaš nalog? Vrati se na početnu i izaberi „Prijavi se“ da napraviš nalog.</p>}
    </main>
  </div>;
}
