const ERROR_MESSAGES = {
  'Invalid login credentials': 'Email ili lozinka nisu ispravni.',
  'Email not confirmed': 'Potvrdi email adresu pre prijave.',
  'User already registered': 'Nalog sa ovim emailom već postoji.',
  'Password should be at least 6 characters': 'Lozinka mora imati najmanje 6 karaktera.',
  'Failed to fetch': 'Trenutno nije moguće povezati se sa serverom. Proveri internet i pokušaj ponovo.',
  ACCOUNT_EXISTS: 'Nalog sa ovim emailom već postoji.',
  RATE_LIMITED: 'Previše pokušaja. Pokušaj ponovo malo kasnije.',
  INVALID_REQUEST: 'Uneti podaci nisu ispravni.',
  SERVICE_UNAVAILABLE: 'Usluga trenutno nije dostupna. Pokušaj ponovo malo kasnije.',
  WEAK_PASSWORD: 'Lozinka mora imati najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.',
};

const MESSAGE_PATTERNS = [
  [/invalid login credentials/i, 'Email ili lozinka nisu ispravni.'],
  [/email not confirmed/i, 'Potvrdi email adresu pre prijave.'],
  [/already registered|already exists|user already/i, 'Nalog sa ovim emailom već postoji.'],
  [/rate limit|too many requests|previše pokušaja/i, 'Previše pokušaja. Pokušaj ponovo malo kasnije.'],
  [/failed to fetch|networkerror|network request failed/i, 'Trenutno nije moguće povezati se sa serverom. Proveri internet i pokušaj ponovo.'],
  [/service unavailable/i, 'Usluga trenutno nije dostupna. Pokušaj ponovo malo kasnije.'],
  [/email.*not.*valid|invalid.*email/i, 'Unesi ispravnu email adresu.'],
  [/password.*weak|weak password/i, 'Lozinka mora imati najmanje 8 karaktera, veliko i malo slovo, broj i specijalni karakter.'],
];

export const FALLBACK_ERROR_MESSAGE = 'Došlo je do greške. Pokušaj ponovo.';

export function getErrorMessage(error) {
  if (!error) return FALLBACK_ERROR_MESSAGE;

  const code = typeof error === 'object' ? error?.code : null;
  const message = typeof error === 'string' ? error : error?.message;

  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (message && ERROR_MESSAGES[message]) return ERROR_MESSAGES[message];

  if (message) {
    const match = MESSAGE_PATTERNS.find(([pattern]) => pattern.test(message));
    if (match) return match[1];

    // Poruke koje mi sami generišemo na srpskom mogu bezbedno u UI.
    if (/[čćžšđČĆŽŠĐ]/.test(message) || /\b(pokušaj|lozink|nalog|email|prijav|server|sesija|profil|ponuda|zahtev|veze)\b/i.test(message)) {
      return message;
    }
  }

  // Nikada ne prikazuj sirovu Supabase/PostgREST/Edge grešku korisniku.
  return FALLBACK_ERROR_MESSAGE;
}
