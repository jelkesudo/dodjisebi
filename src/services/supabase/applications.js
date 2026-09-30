const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function submitApplication(data) {
  if (!url || !anonKey) throw new Error('Prijava još nije povezana sa bazom. Proveri Supabase podešavanja.');
  let response;
  try {
    response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/submit-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({
        firstName: data.firstName, lastName: data.lastName, email: data.email, message: data.message,
        website: data.website, password: data.password, turnstileToken: data.turnstileToken,
      }),
    });
  } catch { throw new Error('Nema veze sa serverom. Proveri internet i pokušaj ponovo.'); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 && payload?.code === 'ACCOUNT_EXISTS') { const error = new Error('Nalog sa ovim emailom već postoji. Prijavi se.'); error.code = 'ACCOUNT_EXISTS'; throw error; }
    if (response.status === 429) throw new Error('Previše pokušaja. Pokušaj kasnije.');
    if (response.status === 400 && payload?.code === 'WEAK_PASSWORD') throw new Error('Lozinka mora imati najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.');
    if (response.status === 400 && payload?.error === 'Verification failed') throw new Error('Bezbednosna provera nije uspela. Pokušaj ponovo.');
    if (response.status === 400) throw new Error('Proveri unete podatke i pokušaj ponovo.');
    throw new Error(payload?.error === 'Account setup failed' ? 'Nalog trenutno nije moguće kreirati. Pokušaj ponovo.' : 'Prijava trenutno nije dostupna. Pokušaj ponovo.');
  }
  return payload;
}
