import { supabase } from './supabaseClient'
import { LEGACY_CATEGORY_REMAP } from './defaultCategories'
import { STORAGE_MAX_UPLOAD_MB } from './tiers'

const SUPABASE_DEFAULT_UPLOAD_MB = 50
const DEFAULT_EMAIL_SENDER = 'BabyJourney <noreply@babyjourney.life>'
const DEFAULT_CONCIERGE_EMAIL = 'concierge@babyjourney.life'
const NAMES_SHOWN = 6
const SIGNUP_CAPS = {
  email: { env: 'SIGNUP_EMAIL_DAILY_CAP', fallback: 80 },
  sms: { env: 'SIGNUP_SMS_DAILY_CAP', fallback: 300 },
}
const SMS_SIGNUP_COUNTRIES = 'Moldova, România, Rusia, Ucraina, Italia, Germania, Franța, Spania, Portugalia, Marea Britanie, SUA/Canada'
const PIN_FAILURES_PER_HOUR = 10
const PIN_FAILURES_PER_DAY = 30
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const FAILURE_PAGE = 1000
const FAILURE_PAGES_MAX = 20

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)
  return !error
}

const isMissingTable = (error) =>
  error.code === 'PGRST205' || error.code === '42P01' || /could not find the table|does not exist/i.test(error.message || '')

export const REQUIRED_COLUMNS = [
  ['photos', 'uploaded_at', 'Dashboard: data reală a postării (acum dedusă din numele fișierului — funcționează, dar coloana rămâne sursa corectă)', null],
  ['photos', 'poster_urls', 'Miniaturi video salvate la încărcare (fără ea: captură în browser, mai lentă)', 'Miniaturile videoclipurilor se generează mai lent, abia la deschidere.'],
  ['photos', 'file_sizes', 'Spațiu utilizat real per postare (fără ea: estimare 2MB/fișier)', 'Spațiul ocupat de fiecare familie este doar estimat, nu calculat exact.'],
  ['skills_progress', 'child_id', 'Skills per copil (fără ea: skills comune pe familie)', 'Abilitățile sunt comune pentru toată familia, nu separate pe fiecare copil.'],
  ['life_chapters', 'description', 'Journey → capitole cu descriere multilinie', 'Capitolele din Journey se salvează fără descriere.'],
  ['life_chapters', 'hashtags', 'Journey → capitole sincronizate cu hashtag-uri', 'Capitolele din Journey se salvează fără hashtag-uri.'],
  ['verification_codes', 'payload', 'Înregistrare self-service (signup) — BLOCATĂ fără ea', 'Familiile nu se pot înregistra singure pe site.'],
  ['families', 'self_registered', 'Marcaj familii înregistrate singure + 2FA la login', 'Familiile nu se pot înregistra singure pe site.'],
]

export const REQUIRED_TABLES = [
  [
    'login_failures',
    'limitele pentru PIN greșit (10 pe oră și 30 pe zi pentru fiecare familie) se țin doar în memoria fiecărei instanțe serverless; în Vercel Logs apare o dată pe instanță „[pin-login] table login_failures is missing (run supabase-migration.sql); PIN failures are limited in memory only”',
    'Limita pentru PIN-urile introduse greșit se ține deocamdată separat pe fiecare server, nu într-un singur loc. Familiile nu observă nicio diferență.',
  ],
]

export const REQUIRED_TABLE_COLUMNS = [
  [
    'login_failures',
    'device_hash',
    'pauza pe un singur dispozitiv (5 PIN-uri greșite → 10 minute, 10 în 24 h → 24 h) se ține doar în memoria fiecărei instanțe serverless, iar „Deblochează” nu o poate ridica; în Vercel Logs apare o dată pe instanță „[pin-login] column login_failures.device_hash is missing (run supabase-migration.sql); the per-device pause is kept in memory only”',
    'Pauza după PIN-uri greșite pe un singur dispozitiv se ține deocamdată separat pe fiecare server. Familiile nu observă nicio diferență.',
  ],
]

const hasText = (value) => !!String(value ?? '').trim()

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

const familiesCount = (n) => {
  if (n === 1) return 'o familie'
  const de = n >= 20 && (n % 100 === 0 || n % 100 >= 20)
  return `${n} ${de ? 'de ' : ''}familii`
}

function nameList(families) {
  const names = families.map((f) => `„${f.name}”`)
  const rest = names.length - NAMES_SHOWN
  return rest > 0
    ? `${names.slice(0, NAMES_SHOWN).join(', ')} și încă ${familiesCount(rest)}`
    : names.join(', ')
}

function signupCap(channel, env) {
  const { env: name, fallback } = SIGNUP_CAPS[channel]
  const n = parseInt(env[name] || '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function readNotificationSetup(env = process.env) {
  const email = !!env.RESEND_API_KEY
  const sms = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER)
  const bypass = env.LOGIN_OTP_BYPASS === 'true'
  return {
    email,
    sms,
    bypass,
    sender: env.RESEND_FROM_EMAIL || '',
    conciergeTo: env.ADMIN_NOTIFY_EMAIL || '',
    emailCap: signupCap('email', env),
    smsCap: signupCap('sms', env),
  }
}

const FAMILY_COLUMNS = 'id, name, email, phone_number, require_otp_login, is_suspended, self_registered'
const FAMILY_COLUMNS_LEGACY = 'id, name, email, phone_number, require_otp_login, is_suspended'

async function readFamilyReach(setup) {
  const read = (columns) => supabase.from('families').select(columns).order('name')
  let { data, error } = await read(FAMILY_COLUMNS)
  if (error && /self_registered/i.test(error.message || '')) {
    ;({ data, error } = await read(FAMILY_COLUMNS_LEGACY))
  }
  if (error) {
    console.error('[setup-status] could not read family contacts:', error.message || error)
    return null
  }
  const families = (data || [])
    .filter((f) => !f.is_suspended)
    .map((f) => ({
      id: f.id,
      name: String(f.name || '').trim() || '—',
      email: hasText(f.email),
      phone: hasText(f.phone_number),
      otp: !!f.require_otp_login,
      self: !!f.self_registered,
    }))
  const reachable = (f) => (setup.email && f.email) || (setup.sms && f.phone)
  const needsCode = (f, bypass) => f.otp && !(bypass && !f.self)
  return {
    withoutEmail: families.filter((f) => !f.email),
    withoutPhone: families.filter((f) => !f.phone),
    loginBlocked: families.filter((f) => needsCode(f, setup.bypass) && !reachable(f)),
    blockedWithoutBypass: families.filter((f) => needsCode(f, false) && !reachable(f)),
  }
}

const CONCIERGE_UNSENT =
  'Cererile pentru serviciile Legacy (poster, anuar, configurare, migrare de date) nu îți pot fi trimise pe email: familia vede că trimiterea nu este disponibilă momentan și poate încerca din nou mai târziu.'

function loginReason(setup, plural) {
  if (!setup.email && !setup.sms) return 'emailul și SMS-ul nu sunt încă conectate'
  const verb = plural ? 'au' : 'are'
  if (setup.email && setup.sms) return `nu ${verb} nici email, nici număr de telefon în cont`
  return setup.email
    ? `nu ${verb} adresă de email în cont, iar SMS-ul nu este încă conectat`
    : `nu ${verb} număr de telefon în cont, iar emailul nu este încă conectat`
}

function loginCheck(setup, reach) {
  const blocked = reach ? reach.loginBlocked : null
  const locked = blocked ? blocked.length > 0 : (!setup.bypass && !setup.email && !setup.sms)
  const n = blocked ? blocked.length : 0
  const single = blocked !== null && n === 1
  const summary = blocked
    ? (single
        ? 'o familie cu verificarea în doi pași activată nu poate intra în album'
        : `${familiesCount(n)} cu verificarea în doi pași activată nu pot intra în album`)
    : 'familiile cu verificarea în doi pași activată nu pot intra în album'

  const consequences = []
  const actions = []
  if (locked) {
    consequences.push(blocked
      ? `${capitalize(summary)}: ${nameList(blocked)}. Codul de autentificare nu ${single ? 'îi' : 'le'} poate fi trimis, pentru că ${loginReason(setup, !single)}.`
      : `${capitalize(summary)}: codul de autentificare nu le poate fi trimis, pentru că emailul și SMS-ul nu sunt încă conectate.`)
    consequences.push('Dezvoltatorul poate rezolva asta imediat — pașii sunt în detaliile tehnice de mai jos.')

    const adminCreated = blocked ? blocked.filter((f) => !f.self) : null
    const selfRegistered = blocked ? blocked.filter((f) => f.self) : []
    if (!setup.bypass && (!adminCreated || adminCreated.length > 0)) {
      actions.push('Soluție imediată pentru familiile create de admin: Vercel → Environment Variables → LOGIN_OTP_BYPASS=true → Redeploy (intră din nou doar cu PIN-ul)')
    }
    if (!setup.email || !setup.sms) {
      const missing = !setup.email && !setup.sms ? 'emailul (Resend) sau SMS-ul (Twilio)' : !setup.email ? 'emailul (Resend)' : 'SMS-ul (Twilio)'
      actions.push(`Soluția de durată: conectează ${missing} — vezi punctele de mai jos`)
    }
    if (selfRegistered.length > 0) {
      actions.push(`Familii înregistrate singure (LOGIN_OTP_BYPASS nu se aplică lor, au nevoie de canalul cu care s-au înregistrat): ${nameList(selfRegistered)}`)
    }
    if (setup.email || setup.sms) {
      actions.push('Sau completează contactul lipsă: Supabase → Table Editor → families → email / phone_number (format +373…); pagina de admin nu are încă formular pentru contactele unei familii existente')
    }
  }

  return {
    key: 'login',
    group: 'notifications',
    ok: !locked,
    signatureKeys: locked && blocked ? blocked.map((f) => `login:${f.id}`) : ['login'],
    blockedFamilies: locked && blocked ? blocked.map((f) => ({ id: f.id, name: f.name, selfRegistered: f.self })) : null,
    title: 'Autentificarea cu cod de verificare',
    headline: single ? 'O familie nu poate intra în album' : 'Unele familii nu pot intra în album',
    summary,
    consequences,
    label: 'Login 2FA — familiile care au nevoie de cod și pot să-l primească',
    detail: locked
      ? `Familii cu require_otp_login${setup.bypass ? ' înregistrate singure (cele create de admin sunt scutite de LOGIN_OTP_BYPASS=true)' : ''} fără contact pe un canal configurat: după PIN-ul corect, /api/auth/pin-login răspunde 503 otpDeliveryUnavailable; Vercel Logs: „[pin-login] this family needs a login code but none of its contacts has a configured channel”${blocked ? '' : ' (contactele familiilor nu au putut fi citite — estimare după variabilele de mediu)'}`
      : (reach
          ? 'Toate familiile care au nevoie de cod la login au un contact pe un canal configurat'
          : 'Contactele familiilor nu au putut fi citite; verificarea se face doar după variabilele de mediu'),
    actions,
  }
}

function lockedUntil(times, now) {
  const day = [...times].sort((a, b) => a - b)
  const hour = day.filter((t) => now - t < HOUR_MS)
  let until = 0
  if (hour.length >= PIN_FAILURES_PER_HOUR) until = Math.max(until, hour[hour.length - PIN_FAILURES_PER_HOUR] + HOUR_MS)
  if (day.length >= PIN_FAILURES_PER_DAY) until = Math.max(until, day[day.length - PIN_FAILURES_PER_DAY] + DAY_MS)
  return until > now ? { until, lastHour: hour.length, lastDay: day.length } : null
}

export async function readPinLockouts(setup, now = Date.now()) {
  const since = new Date(now - DAY_MS).toISOString()
  const byFamily = new Map()
  for (let page = 0; page < FAILURE_PAGES_MAX; page++) {
    const from = page * FAILURE_PAGE
    const { data, error } = await supabase
      .from('login_failures')
      .select('family_id, created_at')
      .not('family_id', 'is', null)
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, from + FAILURE_PAGE - 1)
    if (error) {
      if (!isMissingTable(error)) console.error('[setup-status] could not read login_failures:', error.message || error)
      return null
    }
    for (const row of data || []) {
      const times = byFamily.get(row.family_id) || []
      times.push(new Date(row.created_at).getTime())
      byFamily.set(row.family_id, times)
    }
    if (!data || data.length < FAILURE_PAGE) break
  }

  const locked = []
  for (const [id, times] of byFamily) {
    const state = lockedUntil(times, now)
    if (state) locked.push({ id, ...state })
  }
  if (locked.length === 0) return []

  const { data: families, error } = await supabase
    .from('families')
    .select('id, name, email, phone_number, is_suspended')
    .in('id', locked.map((entry) => entry.id))
  if (error) {
    console.error('[setup-status] could not read the families paused after wrong PINs:', error.message || error)
    return null
  }
  const known = new Map((families || []).filter((f) => !f.is_suspended).map((f) => [f.id, f]))
  return locked
    .filter((entry) => known.has(entry.id))
    .map((entry) => {
      const f = known.get(entry.id)
      return {
        id: entry.id,
        name: String(f.name || '').trim() || '—',
        until: new Date(entry.until).toISOString(),
        failuresLastHour: entry.lastHour,
        failuresLastDay: entry.lastDay,
        reachable: !!((setup.email && hasText(f.email)) || (setup.sms && hasText(f.phone_number))),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

function lockoutAnswer(setup, family) {
  if (family.reachable) return '/api/auth/pin-login răspunde 401 OTP_REQUIRED (loginOtpLockout) la orice PIN; PIN-ul corect primește și un cod, iar intrarea cu codul șterge rândurile familiei'
  if (setup.email || setup.sms) return '/api/auth/pin-login răspunde 401 OTP_REQUIRED (loginOtpLockout), dar niciun canal configurat nu ajunge la contactele familiei, deci codul nu pleacă'
  return 'nici emailul, nici SMS-ul nu sunt configurate → /api/auth/pin-login răspunde 429 până la sfârșitul pauzei'
}

function lockoutCheck(setup, lockouts) {
  const n = lockouts.length
  const single = n === 1
  const withCode = lockouts.filter((f) => f.reachable)
  const withoutCode = lockouts.filter((f) => !f.reachable)
  const one = (list, singular, plural) => (list.length === 1 ? singular : plural)
  const summary = single
    ? 'o familie are intrarea în album pusă pe pauză, după prea multe PIN-uri greșite'
    : `${familiesCount(n)} au intrarea în album pusă pe pauză, după prea multe PIN-uri greșite`

  const consequences = n === 0 ? [] : [
    `Pauza pornește singură după ${PIN_FAILURES_PER_HOUR} PIN-uri greșite într-o oră sau ${PIN_FAILURES_PER_DAY} într-o zi pentru aceeași familie. Este o protecție împotriva celor care încearcă să ghicească PIN-ul, nu o eroare: albumul și amintirile din el nu sunt atinse.`,
    ...(withCode.length
      ? [`${nameList(withCode)} ${one(withCode, 'poate', 'pot')} intra în continuare: după PIN-ul corect ${one(withCode, 'primește', 'primesc')} un cod de verificare ${channelsVia(setup)}, iar după intrarea cu codul pauza se ridică singură.`]
      : []),
    ...(withoutCode.length
      ? [`${nameList(withoutCode)} nu ${one(withoutCode, 'poate', 'pot')} intra până se termină pauza (ora este afișată lângă nume), pentru că nu ${one(withoutCode, 'i se', 'li se')} poate trimite un cod.`]
      : []),
    'Dacă familia te contactează sau știi că a greșit chiar ea PIN-ul, apasă „Deblochează” lângă numele ei: pauza se ridică imediat și familia intră cu PIN-ul corect. O resetare reușită a PIN-ului („Ai uitat PIN-ul?”) ridică și ea pauza.',
  ]

  return {
    key: 'pin_lockout',
    group: 'families',
    ok: n === 0,
    signatureKeys: lockouts.map((f) => `pin_lockout:${f.id}@${Math.floor(new Date(f.until).getTime() / 60000)}`),
    lockouts,
    title: 'Intrare pusă pe pauză după PIN-uri greșite',
    headline: single ? 'Intrarea unei familii în album este pusă pe pauză' : 'Intrarea unor familii în album este pusă pe pauză',
    summary,
    consequences,
    label: `Pauză la login după PIN-uri greșite (login_failures: ≥ ${PIN_FAILURES_PER_HOUR} într-o oră sau ≥ ${PIN_FAILURES_PER_DAY} în 24 h)`,
    detail: n === 0
      ? 'Nicio familie nu este pusă pe pauză'
      : lockouts
          .map((f) => `„${f.name}”: ${f.failuresLastHour} greșite în ultima oră, ${f.failuresLastDay} în ultimele 24 h, pauză până la ${f.until} (UTC); ${lockoutAnswer(setup, f)}`)
          .join('; '),
    actions: n === 0 ? [] : [
      '„Deblochează” = POST /api/admin/families/clear-login-failures { familyId } — șterge rândurile familiei din login_failures (la fel ca o resetare reușită a PIN-ului)',
      'Dacă familia nu a greșit ea PIN-ul, cineva încearcă să-l ghicească: Vercel → Logs → „pin-login”. La nevoie, PIN-urile se schimbă cu POST /api/admin/families/update { id, viewerPin, editorPin } (pagina de admin nu are încă formular pentru asta).',
    ],
  }
}

function resetLine(kind, reach) {
  const base = kind === 'phone'
    ? 'Codul pentru resetarea PIN-ului uitat se trimite prin SMS, pe numărul din cont.'
    : 'Codul pentru resetarea PIN-ului uitat se trimite pe email, la adresa din cont.'
  const word = kind === 'phone' ? 'număr de telefon' : 'adresă de email'
  if (!reach) {
    return `${base} Familiile fără ${word} în cont nu primesc niciun cod (pagina le spune doar că, dacă există un cont, codul a fost trimis).`
  }
  const missing = kind === 'phone' ? reach.withoutPhone : reach.withoutEmail
  if (missing.length === 0) return `${base} Toate familiile au ${word} în cont.`
  const single = missing.length === 1
  return `${base} ${single ? 'Nu are' : 'Nu au'} ${word} în cont și deci nu ${single ? 'primește' : 'primesc'} niciun cod: ${nameList(missing)} (pagina ${single ? 'îi' : 'le'} spune doar că, dacă există un cont, codul a fost trimis).`
}

function emailConsequences(setup, reach) {
  const { sms, bypass } = setup
  if (!sms) {
    return [
      'Familiile nu se pot înregistra singure pe site: pagina de înregistrare spune că înregistrarea nu este disponibilă momentan. Conturile noi le creezi în continuare din „Gestionare Familii”.',
      'Resetarea PIN-ului uitat nu funcționează: familia vede mesajul că trimiterea codului nu este disponibilă momentan.',
      ...(bypass
        ? ['Verificarea în doi pași la autentificare este oprită deocamdată pentru familiile create de tine: ele intră în album doar cu PIN-ul.']
        : []),
      CONCIERGE_UNSENT,
    ]
  }
  return [
    'Înregistrarea pe site merge doar prin SMS, pentru numerele din țările acceptate: cine alege emailul este rugat să folosească SMS-ul.',
    resetLine('phone', reach),
    ...(!reach && !bypass
      ? ['Codul de autentificare se trimite prin SMS; familiile cu verificarea în doi pași activată, dar fără număr de telefon în cont, nu pot intra în album.']
      : []),
    CONCIERGE_UNSENT,
  ]
}

function smsConsequences(setup, reach) {
  const { email, bypass } = setup
  if (!email) {
    return ['Nici SMS-urile nu pleacă. Este suficient ca unul dintre cele două servicii să fie conectat: înregistrarea pe site și resetarea PIN-ului vor funcționa prin acel serviciu, pentru familiile care au în cont contactul respectiv.']
  }
  return [
    'Înregistrarea pe site merge doar prin email: cine alege SMS-ul este rugat să folosească emailul.',
    resetLine('email', reach),
    ...(!reach && !bypass
      ? ['Codul de autentificare se trimite pe email; familiile cu verificarea în doi pași activată, dar fără email în cont, nu pot intra în album.']
      : []),
  ]
}

function channelsVia({ email, sms }) {
  if (email && sms) return 'pe email sau prin SMS'
  return email ? 'pe email' : 'prin SMS'
}

function notificationChecks(setup, reach) {
  const { email, sms, bypass } = setup
  const sender = setup.sender || `${DEFAULT_EMAIL_SENDER} (implicit)`
  const conciergeTo = setup.conciergeTo || `${DEFAULT_CONCIERGE_EMAIL} (implicit — setează ADMIN_NOTIFY_EMAIL)`
  const checks = [loginCheck(setup, reach)]

  const emailActions = [
    `Vercel → Project → Settings → Environment Variables: RESEND_API_KEY (obligatoriu), RESEND_FROM_EMAIL (opțional, implicit ${DEFAULT_EMAIL_SENDER}), ADMIN_NOTIFY_EMAIL (adresa care primește cererile Legacy, implicit ${DEFAULT_CONCIERGE_EMAIL}) → Redeploy`,
    'Domeniul babyjourney.life trebuie să fie „Verified” în Resend, altfel Resend refuză trimiterea și codurile nu ajung: Vercel → Logs → caută „Resend send failed”',
    `Opțional: SIGNUP_EMAIL_DAILY_CAP (implicit ${SIGNUP_CAPS.email.fallback} de emailuri de înregistrare pe zi; planul gratuit Resend are 100 de emailuri pe zi în total)`,
  ]
  if (!sms && bypass) {
    emailActions.push('Apoi, DOAR după ce un cod de test chiar ajunge pe email: LOGIN_OTP_BYPASS=false → Redeploy (pornește 2FA la login pentru familiile create de admin)')
  } else if (sms && !reach && !bypass) {
    emailActions.push('Familiile cu require_otp_login fără telefon în cont nu pot primi codul de login până merge emailul — la nevoie LOGIN_OTP_BYPASS=true → Redeploy')
  }

  checks.push({
    key: 'email',
    group: 'notifications',
    ok: email,
    title: 'Notificări prin email',
    summary: 'familiile nu primesc coduri pe email',
    consequences: email ? [] : emailConsequences(setup, reach),
    label: 'Email (Resend) — coduri de înregistrare / 2FA / resetare PIN, cereri Legacy',
    detail: email
      ? `RESEND_API_KEY setat · expeditor: ${sender} · cererile Legacy ajung la ${conciergeTo} · cel mult ${setup.emailCap} emailuri de înregistrare pe zi (SIGNUP_EMAIL_DAILY_CAP)`
      : [
          `RESEND_API_KEY lipsește → niciun email nu pleacă (coduri, cereri Legacy)${sms ? '; codurile de login și de resetare merg prin SMS acolo unde familia are telefon' : ''}`,
          `LOGIN_OTP_BYPASS=${bypass ? 'true → familiile create de admin intră doar cu PIN-ul' : 'false'}`,
          ...(reach ? [`familii fără email în cont: ${reach.withoutEmail.length ? nameList(reach.withoutEmail) : 'niciuna'}`] : []),
        ].join('; '),
    actions: email ? [] : emailActions,
    otpBypass: bypass,
  })

  checks.push({
    key: 'sms',
    group: 'notifications',
    ok: sms,
    title: 'Notificări prin SMS',
    summary: 'codurile prin SMS nu se trimit',
    consequences: sms ? [] : smsConsequences(setup, reach),
    label: 'SMS (Twilio) — coduri pe telefon, înregistrare prin SMS',
    detail: sms
      ? `TWILIO_* setate · cel mult ${setup.smsCap} SMS-uri de înregistrare pe zi (SIGNUP_SMS_DAILY_CAP)`
      : [
          `TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER lipsesc → SMS-urile nu pleacă${email ? '; înregistrarea prin SMS răspunde 503 și propune emailul; codurile de login și de resetare merg pe email acolo unde familia are email' : ''}`,
          ...(reach ? [`familii fără telefon în cont: ${reach.withoutPhone.length ? nameList(reach.withoutPhone) : 'niciuna'}`] : []),
        ].join('; '),
    actions: sms
      ? []
      : [
          'Vercel → Environment Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (un expeditor care poate trimite în Moldova — vezi NOTIFICATIONS.md) → Redeploy',
          `Twilio Console → Messaging → Settings → Geo permissions: activează doar țările acceptate la înregistrarea prin SMS (${SMS_SIGNUP_COUNTRIES}) sau mai puține, doar cele în care ai familii`,
          `Opțional: SIGNUP_SMS_DAILY_CAP (implicit ${SIGNUP_CAPS.sms.fallback} de SMS-uri de înregistrare pe zi)`,
          'Dacă SMS-urile nu ajung: Vercel → Logs → „Twilio send failed”, apoi Twilio Console → Monitor → Logs → Errors',
          ...(email && !bypass && !reach
            ? ['Familiile cu require_otp_login fără email în cont nu pot primi codul de login până merge SMS-ul — la nevoie LOGIN_OTP_BYPASS=true → Redeploy']
            : []),
        ],
  })

  if (email || sms) {
    const connected = email && sms
      ? 'Emailul și SMS-ul sunt conectate'
      : email ? 'Emailul este conectat' : 'SMS-ul este conectat'
    const via = channelsVia(setup)
    const wouldLock = reach
      ? reach.blockedWithoutBypass.filter((f) => !reach.loginBlocked.includes(f))
      : null
    const lacking = email && sms ? 'niciun contact în cont' : email ? 'email în cont' : 'număr de telefon în cont'
    checks.push({
      key: 'otp_bypass',
      group: 'notifications',
      ok: !bypass,
      title: 'Verificarea în doi pași la autentificare',
      summary: 'familiile create de tine intră în album doar cu PIN-ul, fără verificarea în doi pași',
      consequences: bypass
        ? [`${connected}, dar verificarea în doi pași la autentificare este încă oprită pentru familiile create de tine: ele intră în album doar cu PIN-ul. Familiile înregistrate singure pe site primesc în continuare codul ${via}.`]
        : [],
      label: '2FA la login activ (LOGIN_OTP_BYPASS dezactivat)',
      detail: bypass ? 'LOGIN_OTP_BYPASS=true → codul de login NU este cerut familiilor create de admin' : '2FA la login este activ',
      actions: bypass
        ? [
            `DOAR după ce un cod de test chiar ajunge ${via}: Vercel → Environment Variables → LOGIN_OTP_BYPASS=false → Redeploy`,
            ...(wouldLock === null
              ? (email && sms ? [] : [`Înainte, verifică că familiile cu require_otp_login au ${email ? 'email' : 'număr de telefon'} în cont — celelalte nu vor putea primi codul`])
              : wouldLock.length > 0
                ? [`Atenție: cu LOGIN_OTP_BYPASS=false n-ar mai putea intra (require_otp_login, dar ${wouldLock.length === 1 ? 'nu are' : 'nu au'} ${lacking}): ${nameList(wouldLock)} — completează întâi contactul lipsă`]
                : reach.blockedWithoutBypass.length === 0
                  ? ['Toate familiile cu require_otp_login au un contact pe canalul conectat']
                  : []),
          ]
        : [],
    })
  }

  return checks
}

function notificationSummary(keys) {
  if (keys.has('email') && keys.has('sms')) {
    return 'familiile nu se pot înregistra singure pe site, nu primesc coduri pe email sau SMS, iar cererile pentru serviciile Legacy nu pot fi trimise'
  }
  if (keys.has('email')) return 'înregistrarea pe site și codurile merg doar prin SMS, iar cererile pentru serviciile Legacy nu pot fi trimise'
  if (keys.has('sms')) return 'înregistrarea pe site și codurile merg doar pe email'
  return null
}

const visibleChecks = (pending) => pending.filter((c) => c.group !== 'technical')

const LEAD_KEYS = ['login', 'pin_lockout']

function buildHeadline(pending) {
  const visible = visibleChecks(pending)
  if (visible.length === 0) return 'O actualizare tehnică pentru dezvoltator'
  const lead = LEAD_KEYS.map((key) => visible.find((c) => c.key === key)).find(Boolean)
  if (lead) return lead.headline
  const keys = new Set(visible.map((c) => c.key))
  const onlyNotifications = visible.every((c) => c.group === 'notifications')
  if (onlyNotifications && keys.has('email') && keys.has('sms')) return 'Notificări prin email și SMS — încă neconectate'
  if (onlyNotifications && keys.has('email')) return 'Notificări prin email — încă neconectate'
  if (onlyNotifications && keys.has('sms')) return 'Notificări prin SMS — încă neconectate'
  if (onlyNotifications && keys.has('otp_bypass')) return 'Verificarea în doi pași la autentificare — încă oprită'
  return 'Câteva setări ale platformei sunt încă în lucru'
}

function buildSummary(pending, setup) {
  const visible = visibleChecks(pending)
  if (visible.length === 0) {
    return 'Albumele funcționează normal. Dezvoltatorul are de rulat din nou actualizarea bazei de date — din acest panou nu ai nimic de făcut.'
  }
  const keys = new Set(visible.map((c) => c.key))
  const parts = []
  const notifications = notificationSummary(keys)
  if (notifications) parts.push(notifications)
  for (const c of visible) {
    if (c.key !== 'email' && c.key !== 'sms' && !LEAD_KEYS.includes(c.key)) parts.push(c.summary)
  }
  const leads = LEAD_KEYS.map((key) => visible.find((c) => c.key === key)).filter(Boolean)
  if (leads.length) {
    const [first, ...others] = leads
    const extra = [...others.map((c) => c.summary), ...parts]
    return extra.length
      ? `${capitalize(first.summary)}. În plus, ${extra.join('; ')}.`
      : `${capitalize(first.summary)}.`
  }
  const text = `Până atunci, ${parts.join('; ')}.`
  if (keys.has('otp_bypass')) return text
  return `${text} ${setup.bypass ? 'Albumele funcționează normal, cu PIN-ul.' : 'Albumele funcționează normal.'}`
}

function buildIntro(pending) {
  const keys = new Set(pending.map((c) => c.key))
  const technical = pending.some((c) => c.group === 'technical')
  const visible = visibleChecks(pending)
  const lockout = keys.has('pin_lockout')
  const developerVisible = visible.some((c) => c.key !== 'pin_lockout')
  const opening = keys.has('login') ? 'Nu este o eroare a albumelor.' : 'Nu este o eroare: albumele funcționează normal.'
  const services = keys.has('email') && keys.has('sms')
    ? 'serviciile de email și SMS'
    : keys.has('email') ? 'serviciul de email' : keys.has('sms') ? 'serviciul de SMS' : null
  let developer = null
  if (services && technical) developer = `legătura cu ${services} și actualizarea bazei de date le face dezvoltatorul`
  else if (services) developer = `legătura cu ${services} o face dezvoltatorul, din setările serverului`
  else if (technical && !developerVisible) developer = 'actualizarea bazei de date o face dezvoltatorul'
  else if (developerVisible) developer = 'pașii rămași îi face dezvoltatorul'
  const who = lockout
    ? `Pauza la intrare o poți ridica chiar tu, cu „Deblochează”${developer ? `; ${developer}` : ''}.`
    : `${capitalize(developer || 'pașii rămași îi face dezvoltatorul')} — din acest panou nu ai nimic de apăsat.`
  return `${opening} ${who} ${developerVisible ? 'Până atunci:' : 'Pe scurt:'}`
}

export async function getSetupStatus() {
  const checks = []

  const missing = []
  for (const [table, column, why, plain] of REQUIRED_COLUMNS) {
    if (!(await columnExists(table, column))) missing.push({ table, column, why, plain })
  }
  const missingPlain = [...new Set(missing.map(m => m.plain).filter(Boolean))]
  checks.push({
    key: 'sql_batch2',
    group: 'platform',
    ok: missing.length === 0,
    title: 'Actualizarea bazei de date',
    summary: 'unele funcții noi nu sunt încă disponibile',
    consequences: missing.length
      ? (missingPlain.length ? missingPlain : ['Unele funcții noi nu sunt încă disponibile.'])
      : [],
    label: 'Migrarea SQL supabase-migration.sql',
    detail: missing.length
      ? `Lipsesc ${missing.length} coloane: ${missing.map(m => `${m.table}.${m.column}`).join(', ')}`
      : 'Toate coloanele există',
    actions: ['Supabase → SQL Editor → New query → lipește conținutul din supabase-migration.sql → Run'],
    missing,
  })

  const retired = Object.keys(LEGACY_CATEGORY_REMAP)
  const [{ count: retiredRows }, { count: retiredPosts }] = await Promise.all([
    supabase.from('family_categories').select('*', { count: 'exact', head: true }).in('category_value', retired),
    supabase.from('photos').select('*', { count: 'exact', head: true }).in('category', retired),
  ])
  const categoriesOk = !(retiredRows || retiredPosts)
  checks.push({
    key: 'categories',
    group: 'platform',
    ok: categoriesOk,
    title: 'Categoriile noi',
    summary: 'unele albume folosesc încă vechile categorii (se actualizează singure)',
    consequences: categoriesOk
      ? []
      : ['Unele albume folosesc încă vechile categorii. Se actualizează singure la prima deschidere a albumului de către familie — nu trebuie să faci nimic.'],
    label: 'Noul set de categorii (Milestones · Family · Health · Education · Adventures · Everyday Life)',
    detail: categoriesOk
      ? 'Toate familiile folosesc noul set'
      : `${retiredRows || 0} categorii vechi și ${retiredPosts || 0} postări încă pe vechiul set`,
    actions: ['Se repară singur la prima deschidere a albumului de către familie; sau POST /api/admin/migrate-categories; sau npm run check:setup -- --fix'],
  })

  let bucketLimitMB = null
  let bucketErr = null
  try {
    const { data, error } = await supabase.storage.getBucket('album_uploads')
    if (error) bucketErr = error.message
    else bucketLimitMB = data?.file_size_limit ? Math.round(data.file_size_limit / 1024 / 1024) : null
  } catch (e) { bucketErr = e.message }
  const effectiveMB = bucketLimitMB || SUPABASE_DEFAULT_UPLOAD_MB
  const storageOk = !bucketErr && effectiveMB >= STORAGE_MAX_UPLOAD_MB
  checks.push({
    key: 'storage_limit',
    group: 'platform',
    ok: storageOk,
    title: 'Limita pentru fișiere mari',
    summary: bucketErr
      ? 'limita pentru fișierele mari nu a putut fi verificată'
      : `fișierele mai mari de ${effectiveMB} MB nu pot fi încărcate`,
    consequences: storageOk
      ? []
      : [bucketErr
          ? `Limita pentru fișierele mari nu a putut fi verificată — videoclipurile mari (până la ${STORAGE_MAX_UPLOAD_MB} MB) ar putea fi refuzate la încărcare.`
          : `Videoclipurile și fișierele mai mari de ${effectiveMB} MB sunt refuzate la încărcare (planurile permit până la ${STORAGE_MAX_UPLOAD_MB} MB).`],
    label: `Limita de upload a bucket-ului album_uploads (≥ ${STORAGE_MAX_UPLOAD_MB} MB)`,
    detail: bucketErr
      ? `Nu s-a putut citi bucket-ul: ${bucketErr}`
      : (bucketLimitMB
          ? `Limita bucket: ${bucketLimitMB} MB`
          : `Bucket fără limită proprie → se aplică limita globală a proiectului (implicit ${SUPABASE_DEFAULT_UPLOAD_MB} MB)`),
    actions: [`Supabase → Settings → Storage → "Upload file size limit" → ${STORAGE_MAX_UPLOAD_MB} MB, apoi rulează (sau re-rulează) migrarea SQL care setează limita bucket-ului`],
    bucketLimitMB,
  })

  const setup = readNotificationSetup()
  const reach = await readFamilyReach(setup)
  checks.push(...notificationChecks(setup, reach))

  const lockouts = await readPinLockouts(setup)
  if (lockouts) checks.push(lockoutCheck(setup, lockouts))

  const missingTables = []
  for (const [table, why, plain] of REQUIRED_TABLES) {
    if (!(await columnExists(table, 'id'))) missingTables.push({ table, why, plain })
  }
  const missingTableColumns = []
  for (const [table, column, why, plain] of REQUIRED_TABLE_COLUMNS) {
    if (missingTables.some((m) => m.table === table)) continue
    if (!(await columnExists(table, column))) missingTableColumns.push({ table, column, why, plain })
  }
  const technicalMissing = [...missingTables, ...missingTableColumns]
  checks.push({
    key: 'sql_tables',
    group: 'technical',
    ok: technicalMissing.length === 0,
    title: 'O actualizare tehnică a bazei de date',
    summary: 'dezvoltatorul are de rulat din nou actualizarea bazei de date',
    consequences: technicalMissing.length
      ? [...new Set(technicalMissing.map((m) => m.plain)), 'Nu trebuie să faci nimic: dezvoltatorul rulează din nou fișierul de actualizare a bazei de date.']
      : [],
    label: 'Tabele și coloane noi din supabase-migration.sql (tehnic)',
    detail: technicalMissing.length
      ? [
          ...missingTables.map((m) => `Lipsește tabelul ${m.table}: ${m.why}`),
          ...missingTableColumns.map((m) => `Lipsește coloana ${m.table}.${m.column}: ${m.why}`),
        ].join('; ')
      : 'Toate tabelele și coloanele există',
    actions: ['Supabase → SQL Editor → New query → lipește tot conținutul din supabase-migration.sql → Run (idempotent, sigur de re-rulat; conține și actualizarea opțională a denumirilor de categorii)'],
    missingTables,
    missingTableColumns,
  })

  const ordered = [
    ...LEAD_KEYS.flatMap((key) => checks.filter((c) => c.key === key)),
    ...checks.filter((c) => !LEAD_KEYS.includes(c.key) && c.group !== 'technical'),
    ...checks.filter((c) => c.group === 'technical'),
  ]
  const pending = ordered.filter((c) => !c.ok)
  const pendingKeys = pending.map((c) => c.key).sort()
  return {
    ok: pending.length === 0,
    pendingCount: pending.length,
    pendingKeys,
    signature: pending.flatMap((c) => c.signatureKeys || [c.key]).sort().join(','),
    headline: pending.length ? buildHeadline(pending) : null,
    summary: pending.length ? buildSummary(pending, setup) : null,
    intro: pending.length ? buildIntro(pending) : null,
    checks: ordered,
    checkedAt: new Date().toISOString(),
  }
}
