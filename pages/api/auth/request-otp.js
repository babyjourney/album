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

  const ok = (channel = null, otpRequired = false, extra = {}) => res.status(200).json({
    ok: true,
    otpRequired,                       // false = client can proceed straight to PIN
    deliveryHint: channel,             // 'email' | 'phone' | null
    message: otpRequired
      ? 'Ți-am trimis un cod de verificare.'
      : 'Continuă cu PIN-ul.',
    ...extra,
  })

  // self_registered arrives with sql/sergiu_batch2.sql. Select it defensively so
  // login keeps working on a deployment that hasn't run the migration.
  const selectFamily = async (column, value) => {
    const cols = 'id, name, email, phone_number, is_suspended, require_otp_login, self_registered'
    const build = (c) => {
      const q = supabase.from('families').select(c)
      return column === 'email' ? q.ilike('email', value) : q.eq('phone_number', value)
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
      contactValue = String(phoneNumber).replace(/\s/g, '')
      const data = await selectFamily('phone', contactValue)
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
    // straight to PIN entry. (Backwards compat — most legacy families won't
    // enable OTP login.)
    //
    // LOGIN_OTP_BYPASS is the temporary escape hatch from when Resend/Twilio
    // weren't configured. It deliberately does NOT apply to self-registered
    // families (item 14): they only exist because they received a signup code
    // by email, which proves email delivery works for them — and they were
    // promised a code on every login. Bypassing it for them would silently turn
    // off the 2FA they signed up for.
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

    // Mirrors signup-request: when delivery isn't configured, dev needs to see
    // the code or login is untestable. Never in production.
    const extra = {}
    if (delivery?.mocked && process.env.NODE_ENV !== 'production') {
      extra.devCode = code
    }

    return ok(contactKind, true, extra)
  } catch (error) {
    console.error('request-otp error:', error)
    return ok(null, true)
  }
}
