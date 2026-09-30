import { useEffect, useState } from 'react';
import ClientShell from '../../../components/client/ClientShell/ClientShell';
import { clientPortal } from '../../../services/supabase/clientPortal';
import { authService } from '../../../services/auth/authService';
import { getErrorMessage } from '../../../services/errors/errorMessages';
export default function SettingsPage() {
  const [data, setData] = useState(null),
    [form, setForm] = useState({ firstName: '', lastName: '', phone: '' }),
    [password, setPassword] = useState(''),
    [msg, setMsg] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    clientPortal
      .dashboard()
      .then((d) => {
        setData(d);
        setForm({
          firstName: d.profile?.first_name || '',
          lastName: d.profile?.last_name || '',
          phone: d.profile?.phone || '',
        });
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await clientPortal.updateProfile(form);
      setMsg('Podaci su sačuvani.');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };
  const changePass = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      if (password.length < 8) throw new Error('Lozinka mora imati najmanje 8 karaktera.');
      await authService.updatePassword(password);
      setPassword('');
      setMsg('Lozinka je promenjena.');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };
  return (
    <ClientShell email={data?.email}>
      <div className="client-page-head">
        <p className="kicker">PODEŠAVANJA</p>
        <h1>Moj nalog.</h1>
        <p>Uredi osnovne podatke i bezbednost naloga.</p>
      </div>
      {error && <p className="client-error">{error}</p>}
      {msg && <p className="client-success">{msg}</p>}
      <div className="client-grid">
        <section className="client-card">
          <h2>Lični podaci</h2>
          <form className="client-form" onSubmit={save}>
            <label>
              Ime
              <input
                required
                maxLength={80}
                value={form.firstName}
                onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))}
              />
            </label>
            <label>
              Prezime
              <input
                required
                maxLength={80}
                value={form.lastName}
                onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))}
              />
            </label>
            <label>
              Telefon
              <input
                maxLength={40}
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input disabled value={data?.email || ''} />
            </label>
            <button className="client-btn">Sačuvaj</button>
          </form>
        </section>
        <section className="client-card">
          <h2>Lozinka</h2>
          <form className="client-form" onSubmit={changePass}>
            <label>
              Nova lozinka
              <input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button className="client-btn">Promeni lozinku</button>
          </form>
        </section>
      </div>
    </ClientShell>
  );
}
