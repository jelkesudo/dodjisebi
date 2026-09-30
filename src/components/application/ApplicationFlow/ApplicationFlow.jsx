import { useEffect, useRef, useState } from 'react';
import { submitApplication } from '../../../services/supabase/applications';
import './ApplicationFlow.css';
import { getErrorMessage } from '../../../services/errors/errorMessages';

const empty = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', message: '', website: '' };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      const timer = window.setInterval(() => {
        if (window.turnstile) { window.clearInterval(timer); resolve(window.turnstile); }
      }, 50);
      window.setTimeout(() => { window.clearInterval(timer); if (!window.turnstile) reject(new Error('Turnstile nije moguće učitati.')); }, 8000);
      return;
    }
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('Turnstile nije moguće učitati.'));
    document.head.appendChild(script);
  });
}

export default function ApplicationFlow({ open, onClose, onLogin }) {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const turnstileTokenRef = useRef('');
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape' && status !== 'sending') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open, onClose, status]);

  useEffect(() => {
    if (!open || status === 'success' || !siteKey) return;
    let cancelled = false;
    (async () => {
      try {
        const turnstile = await loadTurnstileScript();
        if (cancelled || !turnstileContainerRef.current || turnstileWidgetIdRef.current !== null) return;
        turnstileWidgetIdRef.current = turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          callback: (token) => { turnstileTokenRef.current = token; setTurnstileReady(true); setError(''); },
          'expired-callback': () => { turnstileTokenRef.current = ''; setTurnstileReady(false); },
          'error-callback': () => { turnstileTokenRef.current = ''; setTurnstileReady(false); setError('Bezbednosna provera trenutno nije dostupna. Pokušaj ponovo.'); },
          theme: 'auto',
        });
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Bezbednosna provera trenutno nije dostupna. Pokušaj ponovo.'); }
      }
    })();
    return () => {
      cancelled = true;
      if (window.turnstile && turnstileWidgetIdRef.current !== null) { try { window.turnstile.remove(turnstileWidgetIdRef.current); } catch {} }
      turnstileWidgetIdRef.current = null; turnstileTokenRef.current = ''; setTurnstileReady(false);
    };
  }, [open, status, siteKey]);

  if (!open) return null;

  const resetTurnstile = () => {
    turnstileTokenRef.current = ''; setTurnstileReady(false);
    if (window.turnstile && turnstileWidgetIdRef.current !== null) { try { window.turnstile.reset(turnstileWidgetIdRef.current); } catch {} }
  };
  const close = () => {
    if (status === 'sending') return;
    setForm(empty); setStatus('idle'); setError(''); setVerificationUrl(''); setSnackbar(null);
    turnstileTokenRef.current = ''; setTurnstileReady(false); onClose();
  };
  const update = (key) => (event) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
    if (status === 'error') setStatus('idle');
    if (error) setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!PASSWORD_RULE.test(form.password)) { setError('Lozinka mora imati najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.'); return; }
    if (form.password !== form.confirmPassword) { setError('Lozinke se ne poklapaju.'); return; }
    if (!siteKey) { setError('Registracija trenutno nije dostupna. Nedostaje konfiguracija verifikacije.'); return; }
    if (!turnstileTokenRef.current) { setError('Potvrdi da nisi robot i pokušaj ponovo.'); return; }

    setStatus('sending'); setError(''); setSnackbar(null);
    try {
      const result = await submitApplication({ ...form, turnstileToken: turnstileTokenRef.current });
      setVerificationUrl(result?.verificationUrl || '');
      setStatus('success');
    } catch (err) {
      if (err?.code === 'ACCOUNT_EXISTS') {
        setSnackbar({ message: 'Nalog sa ovim emailom već postoji.', action: 'Prijavi se' });
      } else setError(getErrorMessage(err));
      setStatus('error'); resetTurnstile();
    }
  };

  return <div className="apply-overlay" role="presentation">
    <button className="apply-backdrop" type="button" onClick={close} aria-label="Zatvori prijavu" />
    <section className="apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <header className="apply-top"><div className="apply-brand">DOĐI SEBI</div><button className="apply-close" type="button" onClick={close} disabled={status === 'sending'} aria-label="Zatvori">×</button></header>
      <div className="apply-progress"><span className="active" /></div>
      {status === 'success' ? <div className="apply-body"><div className="apply-content" role="status">
        <p className="kicker">JOŠ SAMO POTVRDA EMAILA</p>
        <h2 id="apply-title">Proveri svoj email.</h2>
        <p className="apply-description">Nalog je kreiran. Poslali smo ti link za potvrdu email adrese. Nakon potvrde bićeš preusmerena na svoj nalog.</p>
        {verificationUrl && <a className="btn apply-login-link" href={verificationUrl}>Potvrdi email lokalno</a>}
      </div></div> : <form id="application-form" className="apply-body" onSubmit={submit}>
        <div className="apply-content">
          <p className="kicker">NAPRAVI NALOG</p><h2 id="apply-title">Hajde da se upoznamo.</h2>
          <p className="apply-description">Unesi podatke, izaberi lozinku i potvrdi da nisi robot.</p>
          <p className="apply-existing-account">Imaš već nalog? <button type="button" onClick={() => { close(); onLogin?.(); }}>Prijavi se</button></p>
          <div className="apply-fields">
            <label><span>Ime *</span><input name="given-name" autoComplete="given-name" required maxLength={80} value={form.firstName} onChange={update('firstName')} placeholder="Tvoje ime" /></label>
            <label><span>Prezime *</span><input name="family-name" autoComplete="family-name" required maxLength={80} value={form.lastName} onChange={update('lastName')} placeholder="Tvoje prezime" /></label>
            <label className="wide"><span>Email *</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update('email')} placeholder="ime@email.com" /></label>
            <label className="wide"><span>Lozinka *</span><input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={update('password')} placeholder="Najmanje 8 karaktera" /></label>
            <label className="wide"><span>Ponovi lozinku *</span><input name="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Ponovi lozinku" /></label>
            <p className="wide apply-password-hint">Najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.</p>
            <label className="wide"><span>Propratna poruka (opciono)</span><textarea name="message" rows={4} maxLength={2000} value={form.message} onChange={update('message')} placeholder="Ako želiš, napiši nam nešto..." /></label>
            <div className="apply-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} /></label></div>
            <div className="wide apply-turnstile"><div ref={turnstileContainerRef} /></div>
          </div>
          {error && <p className="apply-error" role="alert">{error}</p>}
        </div>
      </form>}
      <footer className="apply-actions">
        <button className="apply-secondary" type="button" onClick={close} disabled={status === 'sending'}>{status === 'success' ? 'Zatvori' : 'Otkaži'}</button>
        {status !== 'success' && <button className="btn" type="submit" form="application-form" disabled={status === 'sending' || !turnstileReady}>{status === 'sending' ? 'Kreiranje naloga...' : 'Napravi nalog'}</button>}
      </footer>
    </section>
    {snackbar && <div className="apply-snackbar" role="alert" aria-live="assertive"><span>{snackbar.message}</span><a href="/prijava" onClick={close}>{snackbar.action}</a><button type="button" onClick={() => setSnackbar(null)} aria-label="Zatvori obaveštenje">×</button></div>}
  </div>;
}
