// Self-registration, step 1 (item 14).
//
// Input:  { familyName, email, phoneNumber }
// Output: { ok: true }  — always, so this can't be used to enumerate accounts.
//
// Emails a 4-digit code and parks the pending registration in the OTP row's
// `payload`. NO family is created here: an unverified email must never be able
// to create a row, or anyone could squat arbitrary addresses.
//
// The family is created in signup-verify.js, once the code comes back.

import { supabase } from '../../../lib/supabaseClient'
import { issueOtp } from '../../../lib/otpStore'
import { sendOtpEmail } from '../../../lib/notifications'
import rateLimiter from '../../../lib/rateLimiter'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Same shape pin-login accepts: Moldova/Romania mobile, optional leading 0.
const PHONE_RE = /^(0)?[67][0-9]{7}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyName, email, phoneNumber } = req.body || {}

  const cleanName = String(familyName || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPhone = String(phoneNumber || '').replace(/[\s-]/g, '')

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Introdu numele familiei' })
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Adresa de email nu este validă' })
  }
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid (ex. 069123456)' })
  }

  // Throttle by client. Every request COUNTS — this endpoint sends an email to
  // an address the caller merely claims to own, so it's a mail-bomb primitive if
  // it's free to call. `recordFailedAttempt` is what actually arms the limiter
  // (see lib/rateLimiter.js: nothing else creates a block), so it must be called
  // on the success path too, not just on errors. Checking isBlocked() without
  // ever recording anything, as this did, means the limiter can never trip.
  const clientId = rateLimiter.getClientId(req, cleanEmail)
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    return res.status(429).json({
      error: `Prea multe încercări. Încearcă din nou în ${rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)}.`,
    })
  }
  rateLimiter.recordFailedAttempt(clientId, null, cleanEmail)

  try {
    // Is this email already taken? We must NOT say so — that would confirm the
    // address is registered. Return the same "code sent" shape and simply don't
    // send anything. The real owner can use "am uitat PIN-ul" instead.
    //
    // Fail CLOSED: maybeSingle() returns data:null both when nothing matched and
    // when the query errored (including "more than one row"), so ignoring the
    // error would mail a code to an address that already has an account.
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

    // PINs are generated now and carried in the payload so they're identical to
    // whatever we show the user after verification.
    const viewerPin = String(Math.floor(1000 + Math.random() * 9000))
    const editorPin = String(Math.floor(10000000 + Math.random() * 90000000))

    const { code } = await issueOtp({
      familyId: null,             // no family yet — that's the point
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

    // When Resend isn't configured, lib/notifications quietly "sends" to the
    // server console. In dev that's the intended workflow — surface the code so
    // signup is testable. NEVER in production, where it would hand out codes.
    const body = { ok: true, codeLength: 4 }
    if (delivery?.mocked && process.env.NODE_ENV !== 'production') {
      body.devCode = code
      body.devNote = 'Email nu este configurat (RESEND_API_KEY). Cod afișat doar în development.'
    }

    return res.status(200).json(body)
  } catch (error) {
    console.error('signup-request error:', error)
    // Same shape on failure — no enumeration, no stack traces to the client.
    return res.status(200).json({ ok: true, codeLength: 4 })
  }
}
