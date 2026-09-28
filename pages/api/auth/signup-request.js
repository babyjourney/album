import { supabase } from '../../../lib/supabaseClient'
import { issueOtp } from '../../../lib/otpStore'
import { sendOtpEmail } from '../../../lib/notifications'
import rateLimiter from '../../../lib/rateLimiter'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^(\+[1-9]\d{6,14}|(0)?[67][0-9]{7})$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyName, email, phoneNumber } = req.body || {}

  const cleanName = String(familyName || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPhone = String(phoneNumber || '').replace(/[\s-]/g, '')

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Introdu numele familiei', errorKey: 'signupErrNameRequired' })
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
  }
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid (ex. 069123456)', errorKey: 'authErrPhoneInvalid' })
  }

  const clientId = rateLimiter.getClientId(req, cleanEmail)
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    return res.status(429).json({
      error: `Prea multe încercări. Încearcă din nou în ${rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)}.`,
      errorKey: 'errRateLimited',
    })
  }
  rateLimiter.recordFailedAttempt(clientId, null, cleanEmail)

  try {
    const { error: schemaProbe } = await supabase
      .from('verification_codes')
      .select('payload')
      .limit(1)
    if (schemaProbe) {
      console.error('[signup] verification_codes.payload missing — run supabase-migration.sql. Refusing signup.')
      return res.status(503).json({
        error: 'Înregistrarea nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'signupUnavailable',
      })
    }

    const { data: existing, error: lookupError } = await supabase
      .from('families')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      console.error('[signup] email lookup failed, refusing to issue a code:', lookupError)
      return res.status(200).json({ ok: true, codeLength: 4 })
    }

    if (existing) {
      console.info('[signup] email already registered, silently ignoring:', cleanEmail)
      return res.status(200).json({ ok: true, codeLength: 4 })
    }

    const viewerPin = String(Math.floor(1000 + Math.random() * 9000))
    const editorPin = String(Math.floor(10000000 + Math.random() * 90000000))

    const { code } = await issueOtp({
      familyId: null,
      contactKind: 'email',
      contactValue: cleanEmail,
      purpose: 'signup',
      payload: {
        familyName: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        viewerPin,
        editorPin,
      },
    })

    const delivery = await sendOtpEmail({ to: cleanEmail, code, purpose: 'signup' })

    if (delivery && delivery.ok === false) {
      console.error('[signup] email send FAILED (see Resend error above) — refusing to claim "code sent"')
      return res.status(503).json({
        error: 'Înregistrarea nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'signupUnavailable',
      })
    }

    const body = { ok: true, codeLength: 4 }
    if (delivery?.mocked) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[signup] email delivery is not configured (RESEND_API_KEY) — cannot send the signup code')
        return res.status(503).json({
          error: 'Înregistrarea nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
          errorKey: 'signupUnavailable',
        })
      }
      body.devCode = code
      body.devNote = 'Email nu este configurat (RESEND_API_KEY). Cod afișat doar în development.'
    }

    return res.status(200).json(body)
  } catch (error) {
    console.error('signup-request error:', error)
    return res.status(200).json({ ok: true, codeLength: 4 })
  }
}
