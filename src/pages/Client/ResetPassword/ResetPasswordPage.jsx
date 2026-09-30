import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../../../services/auth/authService';
import { getStoredSession } from '../../../services/supabase/supabaseClient';
import '../Auth/AuthPage.css';
import { getErrorMessage } from '../../../services/errors/errorMessages';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!getStoredSession()?.access_token) {
      setError('Link za promenu lozinke nije važeći ili je istekao. Zatraži novi link.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError('Lozinka mora imati najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju.');
      return;
    }
    setBusy(true);
    try {
      await authService.updatePassword(password);
      window.history.replaceState({}, '', '/nalog');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); };

  return <div className="auth-page">
    <header className="auth-topbar">
      <button className="auth-home-link" type="button" onClick={goHome} aria-label="DOĐI SEBI — početna"><span className="auth-brand-mark" aria-hidden="true">✦</span><span className="auth-brand-name">DOĐI SEBI</span></button>
      <button className="auth-back-home" type="button" onClick={goHome}><ArrowLeft size={17} aria-hidden="true"/><span>Nazad na početnu</span></button>
    </header>
    <div className="auth-card">
      <p className="kicker">NOVA LOZINKA</p>
      <h1>Postavi novu lozinku.</h1>
      <form onSubmit={submit}>
        <label>Nova lozinka<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label>Ponovi lozinku<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        <p className="auth-note">Najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.</p>
        {error && <p className="client-error" role="alert">{error}</p>}
        <button className="client-btn" disabled={busy}>{busy ? 'Čuvanje...' : 'Sačuvaj novu lozinku'}</button>
      </form>
    </div>
  </div>;
}
