import { supabase } from '../../../lib/supabaseClient'
import { verifyOtp, responseFloor } from '../../../lib/otpStore'
import { sendSignupPinsEmail, sendSignupPinsSms, normalizeLang, emailMatchPattern } from '../../../lib/notifications'
import { normalizePhone, phoneLookupVariants } from '../../../lib/phone'
import rateLimiter from '../../../lib/rateLimiter'
import { ensureFamilyCategories } from '../../../lib/categoryMigration'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const { channel: rawChannel, email, phoneNumber, code, lang } = req.body || {}
  const channel = rawChannel === 'sms' || rawChannel === 'phone' ? 'sms' : 'email'
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPhone = normalizePhone(phoneNumber)
  const cleanCode = String(code || '').trim()
  const contactValue = channel === 'sms' ? cleanPhone : cleanEmail

  if (!contactValue || !cleanCode) {
    return res.status(400).json(
      channel === 'sms'
        ? { error: 'Telefonul și codul sunt obligatorii', errorKey: 'signupErrPhoneCodeRequired' }
        : { error: 'Email și cod sunt obligatorii', errorKey: 'signupErrEmailCodeRequired' }
    )
  }

  const settle = responseFloor(900)
  const clientId = rateLimiter.getClientId(req, contactValue)
  const blockStatus = rateLimiter.isBlocked(clientId)
  if (blockStatus.blocked) {
    await settle()
    return res.status(429).json({
      error: `Prea multe încercări. Încearcă din nou peste ${rateLimiter.formatTimeRemaining(blockStatus.timeRemaining)}.`,
      errorKey: 'errRateLimitedRetryIn',
      retryAfterMs: blockStatus.timeRemaining,
    })
  }

  try {
    const result = await verifyOtp({
      familyId: null,
      contactValue,
      purpose: 'signup',
      code: cleanCode,
    })

    if (!result.ok) {
      rateLimiter.recordFailedAttempt(clientId, cleanCode, contactValue)
      await settle()
      return res.status(401).json({ error: 'Codul este greșit sau a expirat. Cere unul nou.', errorKey: 'signupErrCodeWrong' })
    }

    rateLimiter.recordSuccessfulAttempt(clientId)

    const otpRow = result.otpRow || {}
    const payload = otpRow.payload
    if (!payload || !payload.familyName || !payload.viewerPin || !payload.editorPin) {
      console.error('signup-verify: OTP row has no payload — run supabase-migration.sql')
      return res.status(500).json({ error: 'Înregistrarea nu este configurată complet. Contactează suportul.', errorKey: 'signupErrNotConfigured' })
    }

    const verifiedChannel = otpRow.contact_kind === 'phone' ? 'sms' : 'email'
    const familyEmail = verifiedChannel === 'email' ? String(otpRow.contact_value || '').trim().toLowerCase() || null : null
    const familyPhone = verifiedChannel === 'sms' ? normalizePhone(otpRow.contact_value) : null
    const messageLang = normalizeLang(lang || payload.lang)

    const familyEmailPattern = familyEmail ? emailMatchPattern(familyEmail) : null
    if (verifiedChannel === 'email' && !familyEmailPattern) {
      return res.status(400).json({ error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
    }
    if (verifiedChannel === 'sms' && !familyPhone) {
      return res.status(400).json({ error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
    }

    const alreadyRegistered = verifiedChannel === 'sms'
      ? { error: 'Există deja un cont cu acest număr de telefon. Folosește „Ai uitat PIN-ul?”.', errorKey: 'signupErrPhoneExists' }
      : { error: 'Există deja un cont cu acest email. Folosește „Ai uitat PIN-ul?”.', errorKey: 'signupErrEmailExists' }

    const { data: existing, error: lookupError } = verifiedChannel === 'sms'
      ? await supabase
          .from('families')
          .select('id')
          .in('phone_number', phoneLookupVariants(familyPhone))
          .limit(1)
          .maybeSingle()
      : await supabase
          .from('families')
          .select('id')
          .ilike('email', familyEmailPattern)
          .limit(1)
          .maybeSingle()

    if (lookupError) {
      console.error(`signup-verify: ${verifiedChannel} duplicate check failed:`, lookupError)
      return res.status(500).json({ error: 'Crearea contului a eșuat. Încearcă din nou.', errorKey: 'signupErrCreateFailed' })
    }
    if (existing) {
      return res.status(409).json(alreadyRegistered)
    }

    const { data: family, error: insertError } = await supabase
      .from('families')
      .insert({
        name: payload.familyName,
        email: familyEmail,
        phone_number: familyPhone,
        viewer_pin: payload.viewerPin,
        editor_pin: payload.editorPin,
        package: 'starter',
        email_verified: verifiedChannel === 'email',
        self_registered: true,
        require_otp_login: true,
      })
      .select('id, name, email')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json(alreadyRegistered)
      }
      throw insertError
    }

    try {
      await ensureFamilyCategories(family.id)
    } catch (catErr) {
      console.warn('signup: category seed failed (non-fatal):', catErr)
    }

    try {
      const pinDelivery = verifiedChannel === 'sms'
        ? await sendSignupPinsSms({
            to: familyPhone,
            viewerPin: payload.viewerPin,
            editorPin: payload.editorPin,
            lang: messageLang,
          })
        : await sendSignupPinsEmail({
            to: familyEmail,
            familyName: payload.familyName,
            viewerPin: payload.viewerPin,
            editorPin: payload.editorPin,
            lang: messageLang,
          })
      if (pinDelivery && pinDelivery.ok === false) {
        console.warn(`signup: PIN ${verifiedChannel} failed (non-fatal, PINs are shown in the UI)`)
      }
    } catch (sendErr) {
      console.warn('signup: PIN message failed (non-fatal, PINs are shown in the UI):', sendErr)
    }

    return res.status(200).json({
      ok: true,
      channel: verifiedChannel,
      family: { name: family.name, email: family.email },
      viewerPin: payload.viewerPin,
      editorPin: payload.editorPin,
    })
  } catch (error) {
    console.error('signup-verify error:', error)
    return res.status(500).json({ error: 'Crearea contului a eșuat. Încearcă din nou.', errorKey: 'signupErrCreateFailed' })
  }
}
