import { supabase } from '../../../lib/supabaseClient'
import { issueOtp } from '../../../lib/otpStore'
import { sendOtpEmail, sendOtpSms } from '../../../lib/notifications'
import { normalizePhone, phoneLookupVariants } from '../../../lib/phone'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phoneNumber, email } = req.body || {}

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Introdu numărul de telefon sau email-ul', errorKey: 'authErrContactRequired' })
  }

  const ok = (channel = null, otpRequired = false, extra = {}) => res.status(200).json({
    ok: true,
    otpRequired,
    deliveryHint: channel,
    message: otpRequired
      ? 'Ți-am trimis un cod de verificare.'
      : 'Continuă cu PIN-ul.',
    ...extra,
  })

  const selectFamily = async (column, value) => {
    const cols = 'id, name, email, phone_number, is_suspended, require_otp_login, self_registered'
    const build = (c) => {
      const q = supabase.from('families').select(c)
      return column === 'email'
        ? q.ilike('email', value)
        : q.in('phone_number', phoneLookupVariants(value)).limit(1)
    }
    let { data, error } = await build(cols).maybeSingle()
    if (error && /self_registered/i.test(error.message || '')) {
      ;({ data } = await build('id, name, email, phone_number, is_suspended, require_otp_login').maybeSingle())
    }
    return data
  }

  try {
    let family = null
    let contactKind = null
    let contactValue = null

    if (email) {
      contactValue = String(email).trim().toLowerCase()
      const data = await selectFamily('email', contactValue)
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'email'
      }
    } else {
      contactValue = normalizePhone(phoneNumber)
      if (!contactValue) {
        return res.status(400).json({ error: 'Numărul de telefon nu este valid', errorKey: 'authErrPhoneInvalid' })
      }
      const data = await selectFamily('phone', contactValue)
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'phone'
      }
    }

    if (!family) {
      return ok(email ? 'email' : 'phone', true)
    }

    const bypass = process.env.LOGIN_OTP_BYPASS === 'true' && !family.self_registered
    if (!family.require_otp_login || bypass) {
      return ok(contactKind, false)
    }

    const { code } = await issueOtp({
      familyId: family.id,
      contactKind,
      contactValue,
      purpose: 'login_2fa',
    })

    const delivery = contactKind === 'email'
      ? await sendOtpEmail({ to: contactValue, code, purpose: 'login_2fa' })
      : await sendOtpSms({ to: contactValue, code, purpose: 'login_2fa' })

    const extra = {}
    if (delivery?.mocked) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`[request-otp] ${contactKind} delivery is not configured (RESEND/TWILIO env) — cannot send the login code`)
        return res.status(503).json({
          error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
          errorKey: 'otpDeliveryUnavailable',
        })
      }
      extra.devCode = code
    }

    if (delivery && delivery.ok === false) {
      console.error(`[request-otp] ${contactKind} send FAILED — refusing to claim "code sent"`)
      return res.status(503).json({
        error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'otpDeliveryUnavailable',
      })
    }

    return ok(contactKind, true, extra)
  } catch (error) {
    console.error('request-otp error:', error)
    return ok(null, true)
  }
}
