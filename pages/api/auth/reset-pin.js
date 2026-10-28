import { supabase } from '../../../lib/supabaseClient'
import { normalizePhone, phoneLookupVariants } from '../../../lib/phone'
import { verifyOtp, familyOtpTargets, otpAttemptBudget, responseFloor } from '../../../lib/otpStore'
import { emailMatchPattern } from '../../../lib/notifications'
import { clearLoginFailures } from '../../../lib/loginFailures'
import rateLimiter, { HOUR, DAY } from '../../../lib/rateLimiter'

const RESPONSE_FLOOR_MS = 900

const invalidCode = {
  error: 'Cod de verificare greșit sau expirat.',
  errorKey: 'authErrOtpInvalid',
}

export default async function handler(req, res) {
  const settle = responseFloor(RESPONSE_FLOOR_MS)
  const reply = async (status, body) => {
    if (status < 500) await settle()
    return res.status(status).json(body)
  }

  if (req.method !== 'POST') {
    return reply(405, { error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const { phoneNumber, email, code, newPin, role } = req.body || {}

  if (!code) return reply(400, { error: 'Codul de verificare lipsește', errorKey: 'errCodeMissing' })
  if (!newPin) return reply(400, { error: 'PIN-ul nou lipsește', errorKey: 'errNewPinMissing' })
  if (role !== 'viewer' && role !== 'editor') {
    return reply(400, { error: 'Rol invalid (viewer sau editor)', errorKey: 'errRoleInvalid' })
  }

  const cleanPin = String(newPin).replace(/\D/g, '')
  if (role === 'viewer' && !/^\d{4}$/.test(cleanPin)) {
    return reply(400, { error: 'PIN-ul de viewer trebuie să aibă 4 cifre', errorKey: 'errViewerPin4' })
  }
  if (role === 'editor' && !/^\d{8}$/.test(cleanPin)) {
    return reply(400, { error: 'PIN-ul de editor trebuie să aibă 8 cifre', errorKey: 'errEditorPin8' })
  }

  let contactValue = null
  let lookupQuery = supabase.from('families').select('id, email, phone_number, viewer_pin, editor_pin, is_suspended')

  if (email) {
    contactValue = String(email).trim().toLowerCase()
    const pattern = emailMatchPattern(contactValue)
    if (!pattern) {
      return reply(400, { error: 'Adresa de email nu este validă', errorKey: 'authErrEmailInvalid' })
    }
    lookupQuery = lookupQuery.ilike('email', pattern).limit(1)
  } else if (phoneNumber) {
    contactValue = normalizePhone(phoneNumber)
    if (!contactValue) {
      return reply(400, { error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
    }
    lookupQuery = lookupQuery.in('phone_number', phoneLookupVariants(contactValue)).limit(1)
  } else {
    return reply(400, { error: 'Introdu numărul de telefon sau email-ul', errorKey: 'authErrContactRequired' })
  }

  const failureBuckets = [
    rateLimiter.byIp('reset-pin-fail', req, 15, HOUR),
    rateLimiter.byContact('reset-pin-fail', contactValue, 8, HOUR),
  ]
  const limit = rateLimiter.check(failureBuckets)
  if (!limit.allowed) {
    return reply(429, rateLimiter.tooManyBody(limit.retryAfterMs))
  }

  try {
    const { data: family, error: lookupError } = await lookupQuery.maybeSingle()
    if (lookupError) console.error('reset-pin lookup failed:', lookupError)
    if (lookupError || !family) {
      rateLimiter.record(failureBuckets)
      return reply(400, invalidCode)
    }

    const budget = await otpAttemptBudget({ familyId: family.id, purpose: 'reset_pin', max: 10, windowMs: DAY })
    if (budget.blocked) {
      console.warn('[reset-pin] daily wrong-code budget exhausted for one family, refusing more guesses')
      return reply(400, invalidCode)
    }

    const result = await verifyOtp({
      familyId: family.id,
      contactValue: familyOtpTargets(family, email ? 'email' : 'phone', contactValue).map((target) => target.value),
      purpose: 'reset_pin',
      code: String(code).trim(),
    })

    if (!result.ok) {
      rateLimiter.record(failureBuckets)
      return reply(400, invalidCode)
    }

    if (family.is_suspended) {
      return reply(403, { error: 'Acest cont este suspendat', errorKey: 'errAccountSuspended' })
    }

    const column = role === 'viewer' ? 'viewer_pin' : 'editor_pin'
    const { error: updateError } = await supabase
      .from('families')
      .update({ [column]: cleanPin, updated_at: new Date().toISOString() })
      .eq('id', family.id)

    if (updateError) {
      console.error('reset-pin update failed:', updateError)
      return reply(500, { error: 'Nu s-a putut actualiza PIN-ul', errorKey: 'errPinUpdateFailed' })
    }

    await clearLoginFailures(family)

    return reply(200, {
      ok: true,
      message: 'PIN-ul a fost actualizat. Conectează-te cu noul PIN.',
    })
  } catch (error) {
    console.error('reset-pin error:', error)
    return reply(500, { error: 'Eroare internă', errorKey: 'errServerInternal' })
  }
}
