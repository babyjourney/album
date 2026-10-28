const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'BabyJourney <noreply@babyjourney.life>'

  if (!apiKey) {
    console.log('[notifications] EMAIL (MOCKED — no RESEND_API_KEY):', {
      from, to, subject,
      preview: (text || html || '').slice(0, 200),
    })
    return { ok: true, channel: 'email', mocked: true }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[notifications] Resend send failed:', res.status, body)
      return { ok: false, channel: 'email', error: `Resend HTTP ${res.status}` }
    }
    return { ok: true, channel: 'email' }
  } catch (err) {
    console.error('[notifications] Resend error:', err)
    return { ok: false, channel: 'email', error: err.message }
  }
}

export async function sendSms({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    console.log('[notifications] SMS (MOCKED — Twilio not configured):', {
      from, to, body,
    })
    return { ok: true, channel: 'sms', mocked: true }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
    const params = new URLSearchParams({ From: from, To: to, Body: body })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[notifications] Twilio send failed:', res.status, body)
      return { ok: false, channel: 'sms', error: `Twilio HTTP ${res.status}` }
    }
    return { ok: true, channel: 'sms' }
  } catch (err) {
    console.error('[notifications] Twilio error:', err)
    return { ok: false, channel: 'sms', error: err.message }
  }
}

const LANGS = ['ro', 'ru', 'en']

export const normalizeLang = (lang) => {
  const l = String(lang || '').trim().toLowerCase().slice(0, 2)
  return LANGS.includes(l) ? l : 'ro'
}

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export function maskEmail(email) {
  const s = String(email || '').trim()
  const at = s.lastIndexOf('@')
  if (at < 1) return ''
  const local = s.slice(0, at)
  const shown = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1)
  return `${shown}•••${s.slice(at)}`
}

export function emailMatchPattern(email) {
  const s = String(email || '').trim().toLowerCase()
  if (!s || /[*%\s]/.test(s)) return null
  return s.replace(/[\\_]/g, (ch) => `\\${ch}`)
}

export const isDeliveryUsable = (delivery) =>
  !!delivery && delivery.ok !== false && !(delivery.mocked && process.env.NODE_ENV === 'production')

export const emailConfigured = () => !!process.env.RESEND_API_KEY

export const smsConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)

export const channelConfigured = (kind) =>
  (kind === 'email' ? emailConfigured() : smsConfigured()) || process.env.NODE_ENV !== 'production'

export const anyChannelConfigured = () => channelConfigured('email') || channelConfigured('sms')

const OTP_COPY = {
  ro: {
    subject: (code) => `Codul tău BabyJourney: ${code}`,
    heading: 'Codul tău BabyJourney',
    greeting: 'Salut,',
    purpose: {
      signup: 'pentru a-ți confirma adresa de email',
      reset_pin: 'pentru a-ți reseta PIN-ul',
      login_2fa: 'pentru a finaliza autentificarea',
    },
    intro: (purpose) => `Codul tău de verificare ${purpose}`,
    line: (purpose, code) => `Codul tău de verificare ${purpose} este: ${code}`,
    validity: 'Codul este valabil 10 minute. Dacă nu ai inițiat această cerere, ignoră acest mesaj.',
    sms: {
      signup: 'de inregistrare',
      reset_pin: 'pentru resetarea PIN-ului',
      login_2fa: 'de autentificare',
    },
    smsBody: (purpose, code) => `BabyJourney: codul tau ${purpose} este ${code}. Valabil 10 min. Daca nu ai cerut acest cod, ignora mesajul.`,
  },
  ru: {
    subject: (code) => `Ваш код BabyJourney: ${code}`,
    heading: 'Ваш код BabyJourney',
    greeting: 'Здравствуйте!',
    purpose: {
      signup: 'для подтверждения адреса электронной почты',
      reset_pin: 'для сброса PIN-кода',
      login_2fa: 'для входа в альбом',
    },
    intro: (purpose) => `Ваш проверочный код ${purpose}`,
    line: (purpose, code) => `Ваш проверочный код ${purpose}: ${code}`,
    validity: 'Код действителен 10 минут. Если вы не запрашивали код, просто проигнорируйте это письмо.',
    sms: {
      signup: 'для регистрации',
      reset_pin: 'для сброса PIN',
      login_2fa: 'для входа',
    },
    smsBody: (purpose, code) => `BabyJourney: код ${code} ${purpose}. Действует 10 мин.`,
  },
  en: {
    subject: (code) => `Your BabyJourney code: ${code}`,
    heading: 'Your BabyJourney code',
    greeting: 'Hi,',
    purpose: {
      signup: 'to confirm your email address',
      reset_pin: 'to reset your PIN',
      login_2fa: 'to finish signing in',
    },
    intro: (purpose) => `Your verification code ${purpose}`,
    line: (purpose, code) => `Your verification code ${purpose} is: ${code}`,
    validity: "The code is valid for 10 minutes. If you didn't request it, just ignore this message.",
    sms: {
      signup: 'sign-up',
      reset_pin: 'PIN reset',
      login_2fa: 'sign-in',
    },
    smsBody: (purpose, code) => `BabyJourney: your ${purpose} code is ${code}. Valid for 10 min. If you didn't request it, ignore this message.`,
  },
}

const FORGOT_PIN_URL = 'https://album.babyjourney.life/forgot-password'

const EXISTING_COPY = {
  ro: {
    subject: 'Ai deja un album BabyJourney',
    heading: 'Ai deja un album BabyJourney',
    greeting: 'Salut,',
    body: 'Cineva (probabil tu) a încercat să creeze un album BabyJourney nou cu această adresă de email. Există deja un album pentru ea, așa că nu am creat altul.',
    action: 'Dacă nu mai știi PIN-ul, folosește „Ai uitat PIN-ul?” pe pagina de autentificare:',
    ignore: 'Dacă nu ai cerut tu asta, ignoră acest mesaj.',
    sms: 'BabyJourney: exista deja un album pentru acest numar. Daca nu mai stii PIN-ul, foloseste "Ai uitat PIN-ul?" la autentificare.',
  },
  ru: {
    subject: 'У вас уже есть альбом BabyJourney',
    heading: 'У вас уже есть альбом BabyJourney',
    greeting: 'Здравствуйте!',
    body: 'Кто-то (вероятно, вы) пытался создать новый альбом BabyJourney с этим адресом почты. Для него уже есть альбом, поэтому новый мы не создали.',
    action: 'Если вы не помните PIN-код, нажмите «Забыли PIN-код?» на странице входа:',
    ignore: 'Если это были не вы, просто проигнорируйте это письмо.',
    sms: 'BabyJourney: для этого номера уже есть альбом. Не помните PIN? Нажмите «Забыли PIN-код?» при входе.',
  },
  en: {
    subject: 'You already have a BabyJourney album',
    heading: 'You already have a BabyJourney album',
    greeting: 'Hi,',
    body: 'Someone (probably you) tried to create a new BabyJourney album with this email address. There is already an album for it, so we did not create another one.',
    action: 'If you no longer know your PIN, use "Forgot your PIN?" on the sign-in page:',
    ignore: "If this wasn't you, just ignore this message.",
    sms: 'BabyJourney: there is already an album for this number. If you no longer know your PIN, use "Forgot your PIN?" when signing in.',
  },
}

export function sendExistingAccountEmail({ to, lang }) {
  const copy = EXISTING_COPY[normalizeLang(lang)]
  return sendEmail({
    to,
    subject: copy.subject,
    text: `${copy.greeting}\n\n${copy.body}\n\n${copy.action}\n${FORGOT_PIN_URL}\n\n${copy.ignore}\n\n— BabyJourney`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(copy.heading)}</h2>
        <p style="color: #555; margin: 0 0 16px;">${escapeHtml(copy.body)}</p>
        <p style="color: #555; margin: 0 0 8px;">${escapeHtml(copy.action)}</p>
        <p style="margin: 0 0 20px;"><a href="${FORGOT_PIN_URL}" style="color: #7c3aed; font-weight: 600;">${escapeHtml(FORGOT_PIN_URL.replace(/^https:\/\//, ''))}</a></p>
        <p style="color: #888; font-size: 13px; margin: 0;">${escapeHtml(copy.ignore)}</p>
      </div>
    `,
  })
}

export function sendExistingAccountSms({ to, lang }) {
  const copy = EXISTING_COPY[normalizeLang(lang)]
  return sendSms({ to, body: copy.sms })
}

export function sendExistingAccountNotice({ kind, to, lang }) {
  return kind === 'email'
    ? sendExistingAccountEmail({ to, lang })
    : sendExistingAccountSms({ to, lang })
}

const PIN_COPY = {
  ro: {
    subject: 'Contul tău BabyJourney este gata',
    greeting: 'Salut,',
    created: (name) => `Albumul „${name}” a fost creat.`,
    heading: (name) => `Albumul „${name}” a fost creat`,
    keep: 'Acestea sunt PIN-urile tale. Păstrează acest email.',
    viewerText: (pin) => `PIN vizualizare (4 cifre): ${pin}\n  — pentru bunici, familie: pot vedea albumul, dar nu îl pot modifica.`,
    editorText: (pin) => `PIN editare (8 cifre): ${pin}\n  — pentru părinți: pot adăuga și șterge postări.`,
    viewerLabel: 'PIN vizualizare (bunici, familie):',
    editorLabel: 'PIN editare (părinți):',
    howTo: 'Autentifică-te cu emailul acesta și PIN-ul. La fiecare login îți trimitem un cod de 4 cifre pe email.',
    footer: 'La fiecare autentificare îți trimitem un cod de 4 cifre pe email.',
    keepText: 'Păstrează acest mesaj.',
    sms: (viewer, editor) => `BabyJourney: contul tau e gata. PIN vizualizare: ${viewer}. PIN editare: ${editor}. Pastreaza acest mesaj.`,
  },
  ru: {
    subject: 'Ваш аккаунт BabyJourney готов',
    greeting: 'Здравствуйте!',
    created: (name) => `Альбом «${name}» создан.`,
    heading: (name) => `Альбом «${name}» создан`,
    keep: 'Это ваши PIN-коды. Сохраните это письмо.',
    viewerText: (pin) => `PIN для просмотра (4 цифры): ${pin}\n  — для бабушек, дедушек и родных: они видят альбом, но не могут его изменять.`,
    editorText: (pin) => `PIN для редактирования (8 цифр): ${pin}\n  — для родителей: они могут добавлять и удалять публикации.`,
    viewerLabel: 'PIN для просмотра (бабушки, дедушки, родные):',
    editorLabel: 'PIN для редактирования (родители):',
    howTo: 'Входите с этим адресом почты и PIN-кодом. При каждом входе мы отправляем вам 4-значный код на почту.',
    footer: 'При каждом входе мы отправляем вам 4-значный код на почту.',
    keepText: 'Сохраните это письмо.',
    sms: (viewer, editor) => `BabyJourney: PIN для просмотра ${viewer}, для редактирования ${editor}.`,
  },
  en: {
    subject: 'Your BabyJourney account is ready',
    greeting: 'Hi,',
    created: (name) => `The album "${name}" has been created.`,
    heading: (name) => `The album "${name}" has been created`,
    keep: 'These are your PINs. Keep this email.',
    viewerText: (pin) => `Viewer PIN (4 digits): ${pin}\n  — for grandparents and family: they can see the album but cannot change it.`,
    editorText: (pin) => `Editor PIN (8 digits): ${pin}\n  — for parents: they can add and delete posts.`,
    viewerLabel: 'Viewer PIN (grandparents, family):',
    editorLabel: 'Editor PIN (parents):',
    howTo: 'Sign in with this email address and your PIN. Each time you sign in we send you a 4-digit code by email.',
    footer: 'Each time you sign in we send you a 4-digit code by email.',
    keepText: 'Keep this message.',
    sms: (viewer, editor) => `BabyJourney: your album is ready. Viewer PIN: ${viewer}. Editor PIN: ${editor}. Keep this message.`,
  },
}

const otpPurpose = (purpose) => (purpose === 'reset_pin' || purpose === 'signup' ? purpose : 'login_2fa')

export function sendOtpEmail({ to, code, purpose, lang }) {
  const copy = OTP_COPY[normalizeLang(lang)]
  const p = copy.purpose[otpPurpose(purpose)]
  return sendEmail({
    to,
    subject: copy.subject(code),
    text: `${copy.greeting}\n\n${copy.line(p, code)}\n\n${copy.validity}\n\n— BabyJourney`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(copy.heading)}</h2>
        <p style="color: #555; margin: 0 0 20px;">${escapeHtml(copy.intro(p))}:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #7c3aed; margin: 0 0 20px; font-family: 'JetBrains Mono', monospace;">${escapeHtml(code)}</p>
        <p style="color: #888; font-size: 13px; margin: 0;">${escapeHtml(copy.validity)}</p>
      </div>
    `,
  })
}

export function sendOtpSms({ to, code, purpose, lang }) {
  const copy = OTP_COPY[normalizeLang(lang)]
  return sendSms({
    to,
    body: copy.smsBody(copy.sms[otpPurpose(purpose)], code),
  })
}

export function sendOtp({ kind, to, code, purpose, lang }) {
  return kind === 'email'
    ? sendOtpEmail({ to, code, purpose, lang })
    : sendOtpSms({ to, code, purpose, lang })
}

export function sendSignupPinsEmail({ to, familyName, viewerPin, editorPin, lang }) {
  const copy = PIN_COPY[normalizeLang(lang)]
  const name = String(familyName || '').trim()
  return sendEmail({
    to,
    subject: copy.subject,
    text: [
      copy.greeting,
      '',
      copy.created(name),
      '',
      copy.viewerText(viewerPin),
      '',
      copy.editorText(editorPin),
      '',
      copy.howTo,
      '',
      copy.keepText,
    ].join('\n'),
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(copy.heading(name))}</h2>
        <p style="color: #555; margin: 0 0 20px;">${escapeHtml(copy.keep)}</p>
        <p style="margin: 0 0 8px; color:#555;">${escapeHtml(copy.viewerLabel)}</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #7c3aed; margin: 0 0 20px;">${escapeHtml(viewerPin)}</p>
        <p style="margin: 0 0 8px; color:#555;">${escapeHtml(copy.editorLabel)}</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #7c3aed; margin: 0 0 20px;">${escapeHtml(editorPin)}</p>
        <p style="color: #888; font-size: 13px; margin: 0;">${escapeHtml(copy.footer)}</p>
      </div>
    `,
  })
}

export function sendSignupPinsSms({ to, viewerPin, editorPin, lang }) {
  const copy = PIN_COPY[normalizeLang(lang)]
  return sendSms({ to, body: copy.sms(viewerPin, editorPin) })
}
