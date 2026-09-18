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

// Flag emoji straight from the ISO 3166-1 alpha-2 code (regional indicators),
// so the full list below doesn't need to carry 200 hand-typed emoji.
const flagOf = (code) =>
  String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))

// (Sergiu 18.09) The picker used to offer 11 countries; sooner or later every
// dial code would be needed, so here is the whole ITU list. The first PINNED
// entries stay in this order — Moldova first (that's where the clients are),
// then the countries the diaspora actually lives in; the UI appends the rest
// sorted by the visitor's language (signup.js uses Intl.DisplayNames for the
// localized country names, so we only store code + dial here).
const PINNED = [
  ['MD', '+373'], ['RO', '+40'], ['RU', '+7'], ['UA', '+380'],
  ['IT', '+39'], ['DE', '+49'], ['FR', '+33'], ['ES', '+34'],
  ['PT', '+351'], ['GB', '+44'], ['US', '+1'],
]

const REST = [
  ['AD', '+376'], ['AE', '+971'], ['AF', '+93'], ['AG', '+1268'], ['AI', '+1264'],
  ['AL', '+355'], ['AM', '+374'], ['AO', '+244'], ['AR', '+54'], ['AS', '+1684'],
  ['AT', '+43'], ['AU', '+61'], ['AW', '+297'], ['AZ', '+994'], ['BA', '+387'],
  ['BB', '+1246'], ['BD', '+880'], ['BE', '+32'], ['BF', '+226'], ['BG', '+359'],
  ['BH', '+973'], ['BI', '+257'], ['BJ', '+229'], ['BM', '+1441'], ['BN', '+673'],
  ['BO', '+591'], ['BR', '+55'], ['BS', '+1242'], ['BT', '+975'], ['BW', '+267'],
  ['BY', '+375'], ['BZ', '+501'], ['CA', '+1'], ['CD', '+243'], ['CF', '+236'],
  ['CG', '+242'], ['CH', '+41'], ['CI', '+225'], ['CK', '+682'], ['CL', '+56'],
  ['CM', '+237'], ['CN', '+86'], ['CO', '+57'], ['CR', '+506'], ['CU', '+53'],
  ['CV', '+238'], ['CW', '+599'], ['CY', '+357'], ['CZ', '+420'], ['DJ', '+253'],
  ['DK', '+45'], ['DM', '+1767'], ['DO', '+1809'], ['DZ', '+213'], ['EC', '+593'],
  ['EE', '+372'], ['EG', '+20'], ['ER', '+291'], ['ET', '+251'], ['FI', '+358'],
  ['FJ', '+679'], ['FK', '+500'], ['FM', '+691'], ['FO', '+298'], ['GA', '+241'],
  ['GD', '+1473'], ['GE', '+995'], ['GF', '+594'], ['GH', '+233'], ['GI', '+350'],
  ['GL', '+299'], ['GM', '+220'], ['GN', '+224'], ['GP', '+590'], ['GQ', '+240'],
  ['GR', '+30'], ['GT', '+502'], ['GU', '+1671'], ['GW', '+245'], ['GY', '+592'],
  ['HK', '+852'], ['HN', '+504'], ['HR', '+385'], ['HT', '+509'], ['HU', '+36'],
  ['ID', '+62'], ['IE', '+353'], ['IL', '+972'], ['IN', '+91'], ['IQ', '+964'],
  ['IR', '+98'], ['IS', '+354'], ['JM', '+1876'], ['JO', '+962'], ['JP', '+81'],
  ['KE', '+254'], ['KG', '+996'], ['KH', '+855'], ['KI', '+686'], ['KM', '+269'],
  ['KN', '+1869'], ['KP', '+850'], ['KR', '+82'], ['KW', '+965'], ['KY', '+1345'],
  ['KZ', '+7'], ['LA', '+856'], ['LB', '+961'], ['LC', '+1758'], ['LI', '+423'],
  ['LK', '+94'], ['LR', '+231'], ['LS', '+266'], ['LT', '+370'], ['LU', '+352'],
  ['LV', '+371'], ['LY', '+218'], ['MA', '+212'], ['MC', '+377'], ['ME', '+382'],
  ['MG', '+261'], ['MH', '+692'], ['MK', '+389'], ['ML', '+223'], ['MM', '+95'],
  ['MN', '+976'], ['MO', '+853'], ['MP', '+1670'], ['MQ', '+596'], ['MR', '+222'],
  ['MS', '+1664'], ['MT', '+356'], ['MU', '+230'], ['MV', '+960'], ['MW', '+265'],
  ['MX', '+52'], ['MY', '+60'], ['MZ', '+258'], ['NA', '+264'], ['NC', '+687'],
  ['NE', '+227'], ['NF', '+672'], ['NG', '+234'], ['NI', '+505'], ['NL', '+31'],
  ['NO', '+47'], ['NP', '+977'], ['NR', '+674'], ['NU', '+683'], ['NZ', '+64'],
  ['OM', '+968'], ['PA', '+507'], ['PE', '+51'], ['PF', '+689'], ['PG', '+675'],
  ['PH', '+63'], ['PK', '+92'], ['PL', '+48'], ['PM', '+508'], ['PR', '+1787'],
  ['PS', '+970'], ['PW', '+680'], ['PY', '+595'], ['QA', '+974'], ['RE', '+262'],
  ['RS', '+381'], ['RW', '+250'], ['SA', '+966'], ['SB', '+677'], ['SC', '+248'],
  ['SD', '+249'], ['SE', '+46'], ['SG', '+65'], ['SH', '+290'], ['SI', '+386'],
  ['SK', '+421'], ['SL', '+232'], ['SM', '+378'], ['SN', '+221'], ['SO', '+252'],
  ['SR', '+597'], ['SS', '+211'], ['ST', '+239'], ['SV', '+503'], ['SX', '+1721'],
  ['SY', '+963'], ['SZ', '+268'], ['TC', '+1649'], ['TD', '+235'], ['TG', '+228'],
  ['TH', '+66'], ['TJ', '+992'], ['TK', '+690'], ['TL', '+670'], ['TM', '+993'],
  ['TN', '+216'], ['TO', '+676'], ['TR', '+90'], ['TT', '+1868'], ['TV', '+688'],
  ['TW', '+886'], ['TZ', '+255'], ['UG', '+256'], ['UY', '+598'], ['UZ', '+998'],
  ['VA', '+379'], ['VC', '+1784'], ['VE', '+58'], ['VG', '+1284'], ['VI', '+1340'],
  ['VN', '+84'], ['VU', '+678'], ['WF', '+681'], ['WS', '+685'], ['XK', '+383'],
  ['YE', '+967'], ['YT', '+262'], ['ZA', '+27'], ['ZM', '+260'], ['ZW', '+263'],
]

// How many entries at the head of COUNTRIES keep their curated order.
export const PINNED_COUNT = PINNED.length

export const COUNTRIES = [...PINNED, ...REST].map(([code, dial]) => ({
  code,
  dial,
  flag: flagOf(code),
}))

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
// Longest dial prefix wins: "+1242…" is the Bahamas (+1242), not the US (+1).
export function formatPhoneDisplay(stored) {
  const e164 = normalizePhone(stored)
  if (!e164) return stored || ''
  const c = COUNTRIES
    .filter((x) => e164.startsWith(x.dial))
    .sort((a, b) => b.dial.length - a.dial.length)[0]
  if (!c) return e164
  const local = e164.slice(c.dial.length)
  return `${c.dial} ${local.replace(/(\d{2})(\d{3})(\d{3,})/, '$1 $2 $3')}`.trim()
}
