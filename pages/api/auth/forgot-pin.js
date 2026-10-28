import { supabase } from '../../../lib/supabaseClient'
import { normalizePhone, phoneLookupVariants, maskPhone } from '../../../lib/phone'
import { issueAndSendOtp, familyOtpTargets, responseFloor } from '../../../lib/otpStore'
import { normalizeLang, maskEmail, emailMatchPattern, channelConfigured, anyChannelConfigured } from '../../../lib/notifications'
import rateLimiter, { HOUR } from '../../../lib/rateLimiter'

const RESPONSE_FLOOR_MS = 900

const maskContact = (kind, value) => (kind === 'email' ? maskEmail(value) : maskPhone(value))

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const settle = responseFloor(RESPONSE_FLOOR_MS)
  const { phoneNumber, email, role, lang } = req.body || {}
  const language = normalizeLang(lang)

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Introdu numărul de telefon sau adresa de email', errorKey: 'authErrContactRequired' })
  }

  const validRole = role === 'editor' || role === 'viewer' ? role : null
  const contactKind = email ? 'email' : 'phone'
  const contactValue = email ? String(email).trim().toLowerCase() : normalizePhone(phoneNumber)

  if (!contactValue) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
  }

  const emailPattern = contactKind === 'email' ? emailMatchPattern(contactValue) : null
  if (contactKind === 'email' && !emailPattern) {
    return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
  }

  const limit = rateLimiter.take([
    rateLimiter.byIp('forgot-pin', req, 10, HOUR),
    rateLimiter.byContact('forgot-pin', contactValue, 5, HOUR),
  ])
  if (!limit.allowed) {
    return res.status(429).json(rateLimiter.tooManyBody(limit.retryAfterMs))
  }

  if (!anyChannelConfigured()) {
    console.error('[forgot-pin] neither RESEND nor TWILIO is configured — cannot send PIN reset codes')
    return res.status(503).json({
      error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
      errorKey: 'otpDeliveryUnavailable',
    })
  }

  const genericResponse = async () => {
    await settle()
    return res.status(200).json({
      ok: true,
      deliveryHint: contactKind,
      deliveryTo: maskContact(contactKind, contactValue) || null,
      fallback: !channelConfigured(contactKind),
      message: 'Dacă există un cont asociat, ai primit un cod de verificare.',
    })
  }

  try {
    let lookup = supabase
      .from('families')
      .select('id, name, email, phone_number, is_suspended')
    lookup = contactKind === 'email'
      ? lookup.ilike('email', emailPattern).limit(1)
      : lookup.in('phone_number', phoneLookupVariants(contactValue)).limit(1)
    const { data, error: lookupError } = await lookup.maybeSingle()
    if (lookupError) console.error('[forgot-pin] family lookup failed:', lookupError)
    const family = data && !data.is_suspended ? data : null

    if (!family) {
      return await genericResponse()
    }

    const sent = await issueAndSendOtp({
      familyId: family.id,
      targets: familyOtpTargets(family, contactKind, contactValue),
      purpose: 'reset_pin',
      role: validRole,
      lang: language,
      maxIssuedPerHour: 5,
      maxIssuedPerDay: 10,
    })

    if (!sent.ok) {
      console.error(`[forgot-pin] reset code not sent (${sent.reason})`)
    }

    return await genericResponse()
  } catch (error) {
    console.error('forgot-pin error:', error)
    return await genericResponse()
  }
}
