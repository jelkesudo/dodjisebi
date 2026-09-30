import { anonKey, baseUrl, getStoredSession, storeSession, authorizedFetch } from '../supabase/supabaseClient';

async function auth(path, body) {
  if (!baseUrl || !anonKey) throw new Error('Supabase konfiguracija nedostaje.');
  const response = await fetch(`${baseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || 'Zahtev nije uspeo.');
  return data;
}

export const authService = {
  session: getStoredSession,
  async signIn(email, password) {
    const data = await auth('token?grant_type=password', { email: email.trim().toLowerCase(), password });
    storeSession(data);
    return data;
  },
  async signUp({ email, password, firstName, lastName }) {
    const data = await auth('signup', {
      email: email.trim().toLowerCase(), password,
      data: { first_name: firstName.trim(), last_name: lastName.trim() },
    });
    if (data?.access_token) storeSession(data);
    return data;
  },
  async sendPasswordReset(email) {
    if (!baseUrl || !anonKey) throw new Error('Supabase konfiguracija nedostaje.');
    const response = await fetch(`${baseUrl}/functions/v1/request-password-reset`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) throw new Error('Previše pokušaja. Pokušaj ponovo malo kasnije.');
      throw new Error(data?.error || 'Link za promenu lozinke trenutno nije moguće poslati.');
    }
    return data;
  },
  async updatePassword(password) {
    const response = await authorizedFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || 'Lozinka nije promenjena.');
    return data;
  },
  async signOut() {
    const session = getStoredSession();
    if (session?.access_token && baseUrl && anonKey) {
      await fetch(`${baseUrl}/auth/v1/logout`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
    }
    storeSession(null);
  },
};
