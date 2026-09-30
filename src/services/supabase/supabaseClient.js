const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'dodji-sebi-client-session';

function configured() {
  if (!baseUrl || !anonKey) throw new Error('Supabase konfiguracija nedostaje.');
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


export function getSessionUserId() {
  const session = getStoredSession();
  if (session?.user?.id) return session.user.id;
  try {
    const payload = JSON.parse(atob((session?.access_token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.sub === 'string' ? payload.sub : '';
  } catch { return ''; }
}

export function storeSession(session) {
  if (session?.access_token) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('dodji-sebi-auth-change'));
}

async function authRequest(path, { method = 'POST', body, token } = {}) {
  configured();
  const response = await fetch(`${baseUrl}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || 'Zahtev nije uspeo.');
  return data;
}

export async function refreshSession() {
  const current = getStoredSession();
  if (!current?.refresh_token) return null;
  try {
    const next = await authRequest('token?grant_type=refresh_token', { body: { refresh_token: current.refresh_token } });
    storeSession(next);
    return next;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function getValidSession() {
  const session = getStoredSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0);
  if (expiresAt && expiresAt * 1000 > Date.now() + 60_000) return session;
  return refreshSession();
}

export async function authorizedFetch(path, options = {}) {
  configured();
  let session = await getValidSession();
  if (!session) throw new Error('Potrebno je da se prijaviš.');

  const run = (accessToken) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let response = await run(session.access_token);
  if (response.status === 401) {
    session = await refreshSession();
    if (!session) throw new Error('Sesija je istekla. Prijavi se ponovo.');
    response = await run(session.access_token);
  }
  return response;
}

export { baseUrl, anonKey };
