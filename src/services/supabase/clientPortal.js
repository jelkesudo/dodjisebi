import { authorizedFetch, baseUrl, anonKey, getStoredSession, getSessionUserId } from './supabaseClient';

async function edge(name, { method = 'GET', body } = {}) {
  const response = await authorizedFetch(`/functions/v1/${name}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Zahtev nije uspeo.');
  return data;
}

export const clientPortal = {
  dashboard: () => edge('get-client-dashboard'),
  validatePromo: (offeringId, code) => edge('validate-promo', { method: 'POST', body: { offeringId, code } }),
  createOrder: (offeringId, promoCode = null) => edge('create-order', { method: 'POST', body: { offeringId, promoCode } }),
  cancelSubscription: (subscriptionId) => edge('cancel-subscription', { method: 'POST', body: { subscriptionId } }),
  async offerings() {
    const response = await fetch(`${baseUrl}/rest/v1/offerings?select=id,type,slug,title,short_description,description,access_days,starts_at,ends_at,offering_prices(id,currency,amount,billing_interval)&active=eq.true&order=created_at.asc`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error('Ponuda trenutno nije dostupna.');
    return data;
  },
  async updateProfile({ firstName, lastName, phone }) {
    const response = await authorizedFetch('/rest/v1/client_profiles?user_id=eq.' + encodeURIComponent(getSessionUserId()), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() }),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data?.message || 'Profil nije sačuvan.');
    return data?.[0] || null;
  },
};
