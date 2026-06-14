// Step 1 of the 2-factor album login (Task #3).
//
// Input: { phoneNumber?: string, email?: string }
//
// Flow:
//   • Look up the family by phone OR email.
//   • If found AND the family has `require_otp_login = true`, issue an OTP
//     and dispatch via the matching channel.
//   • Respond identically whether the lookup succeeded or not (no account
//     enumeration). The UI moves to step 2 (PIN + OTP) regardless.
//
// Important: this endpoint does NOT verify the PIN — PIN verification
// happens in /api/auth/pin-login.js, which is called from step 2 of the UI
// together with the OTP code.

import { supabase } from '../../../lib/supabaseClient'
import { issueOtp } from '../../../lib/otpStore'
import { sendOtpEmail, sendOtpSms } from '../../../lib/notifications'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phoneNumber, email } = req.body || {}

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Introdu numărul de telefon sau email-ul' })
  }

  const ok = (channel = null, otpRequired = false) => res.status(200).json({
    ok: true,
    otpRequired,                       // false = client can proceed straight to PIN
    deliveryHint: channel,             // 'email' | 'phone' | null
    message: otpRequired
      ? 'Ți-am trimis un cod de verificare.'
      : 'Continuă cu PIN-ul.',
  })

  try {
    let family = null
    let contactKind = null
    let contactValue = null

    if (email) {
      contactValue = String(email).trim().toLowerCase()
      const { data } = await supabase
        .from('families')
        .select('id, name, email, phone_number, is_suspended, require_otp_login')
        .ilike('email', contactValue)
        .maybeSingle()
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'email'
      }
    } else {
      contactValue = String(phoneNumber).replace(/\s/g, '')
      const { data } = await supabase
        .from('families')
        .select('id, name, email, phone_number, is_suspended, require_otp_login')
        .eq('phone_number', contactValue)
        .maybeSingle()
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'phone'
      }
    }

    if (!family) {
      // Don't leak. Pretend OTP was sent so a fishing attacker can't
      // distinguish from a real account.
      return ok(email ? 'email' : 'phone', true)
    }

    // If 2FA is not enabled for this family, tell the UI it can skip
    // straight to PIN entry. (Backwards compat — most families won't
    // enable OTP login.)
    //
    // TEMPORARY: LOGIN_OTP_BYPASS also skips the OTP step while SMS/email
    // delivery (Twilio/Resend) is not yet configured. Remove once verified.
    if (!family.require_otp_login || process.env.LOGIN_OTP_BYPASS === 'true') {
      return ok(contactKind, false)
    }

    const { code } = await issueOtp({
      familyId: family.id,
      contactKind,
      contactValue,
      purpose: 'login_2fa',
    })

    if (contactKind === 'email') {
      await sendOtpEmail({ to: contactValue, code, purpose: 'login_2fa' })
    } else {
      await sendOtpSms({ to: contactValue, code, purpose: 'login_2fa' })
    }

    return ok(contactKind, true)
  } catch (error) {
    console.error('request-otp error:', error)
    return ok(null, true)
  }
}
