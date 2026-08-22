// One phone-number normalizer for every route that reads, stores or looks up a
// number. Isomorphic (no deps, no env) — imported by pages and API routes alike.
//
// (Sergiu 29.07 #5) Registration used to force the Moldovan national format
// ("069010712"). The signup form now has a country picker and stores E.164
// ("+37369010712"). But login, forgot-PIN, OTP and the admin forms still
// assumed "069…" — so a self-registered family could not log in by phone, and
// an admin could not enter an international number. Everything goes through
// here now: any spelling in → E.164 out, and lookups match every spelling a
// stored row might have.

export const COUNTRIES = [
  { code: 'MD', flag: '🇲🇩', dial: '+373' },
  { code: 'RO', flag: '🇷🇴', dial: '+40' },
  { code: 'RU', flag: '🇷🇺', dial: '+7' },
  { code: 'UA', flag: '🇺🇦', dial: '+380' },
  { code: 'IT', flag: '🇮🇹', dial: '+39' },
  { code: 'DE', flag: '🇩🇪', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', dial: '+33' },
  { code: 'ES', flag: '🇪🇸', dial: '+34' },
  { code: 'PT', flag: '🇵🇹', dial: '+351' },
  { code: 'GB', flag: '🇬🇧', dial: '+44' },
  { code: 'US', flag: '🇺🇸', dial: '+1' },
]

// Numbers typed without a country code are Moldovan — that's where the clients are.
export const DEFAULT_DIAL = '+373'

export const dialOf = (code) => COUNTRIES.find((c) => c.code === code)?.dial || ''

const digitsOnly = (s) => String(s || '').replace(/\D/g, '')

// Any spelling → E.164 ("+37369010712"), or null when it can't be a phone number.
//   "+373 69 010 712" → "+37369010712"
//   "0037369010712"   → "+37369010712"
//   "069010712"       → "+37369010712"   (national format, default country)
//   "69010712"        → "+37369010712"
export function normalizePhone(raw, defaultDial = DEFAULT_DIAL) {
  if (raw === null || raw === undefined) return null
  let s = String(raw).trim().replace(/[\s\-().]/g, '')
  if (!s) return null
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (s.startsWith('+')) {
    const d = digitsOnly(s)
    return d.length >= 7 && d.length <= 15 && d[0] !== '0' ? '+' + d : null
  }
  const d = digitsOnly(s)
  if (!d || d.length !== s.length) return null   // letters or stray symbols
  const local = d.replace(/^0+/, '')
  if (local.length < 6 || local.length > 12) return null
  return `${defaultDial}${local}`
}

export const isValidPhone = (raw) => normalizePhone(raw) !== null

// Every spelling a stored `families.phone_number` might have for this number.
// Older rows hold the national form ("069010712"), newer ones E.164 — a lookup
// must match both, or a family stops being able to log in after the format
// changes. Use with `.in('phone_number', phoneLookupVariants(x))`.
export function phoneLookupVariants(raw) {
  const e164 = normalizePhone(raw)
  if (!e164) return []
  const out = new Set([e164, e164.slice(1)])
  const rawDigits = digitsOnly(raw)
  if (rawDigits) {
    out.add(rawDigits)
    if (!rawDigits.startsWith('0')) out.add('0' + rawDigits)
  }
  if (e164.startsWith(DEFAULT_DIAL)) {
    const local = e164.slice(DEFAULT_DIAL.length)
    out.add(local)
    out.add('0' + local)
  }
  return [...out]
}

// "+37369010712" → "+373 69 010 712" for display; anything else unchanged.
export function formatPhoneDisplay(stored) {
  const e164 = normalizePhone(stored)
  if (!e164) return stored || ''
  const c = COUNTRIES.find((x) => e164.startsWith(x.dial))
  if (!c) return e164
  const local = e164.slice(c.dial.length)
  return `${c.dial} ${local.replace(/(\d{2})(\d{3})(\d{3,})/, '$1 $2 $3')}`.trim()
}
