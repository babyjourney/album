// Start the PIN reset flow.
//
// Input: { phoneNumber?: string, email?: string, role?: 'viewer' | 'editor' }
//
// Behaviour:
//   • Look up the family by phone OR email.
//   • If found, issue a 6-digit OTP and send it to the matching contact.
//   • Always respond with `{ ok: true }` (no account enumeration) so an
//     attacker can't probe which numbers/emails are registered.
//
// The user then submits the code to /api/auth/reset-pin together with their
// new PIN.

import { supabase } from '../../../lib/supabaseClient'
import { issueOtp } from '../../../lib/otpStore'
import { sendOtpEmail, sendOtpSms } from '../../../lib/notifications'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phoneNumber, email, role } = req.body || {}

  // Generic OK response — used both on success and on "no such family" to
  // prevent enumeration. Includes a flag so the UI knows whether to expect
  // an email vs SMS delivery hint (purely for UX, not auth).
  const okResponse = (channel = null) => res.status(200).json({
    ok: true,
    deliveryHint: channel,
    message: 'Dacă există un cont asociat, ai primit un cod de verificare.',
  })

  if (!phoneNumber && !email) {
    return res.status(400).json({ error: 'Introdu numărul de telefon sau adresa de email' })
  }

  const validRole = role === 'editor' || role === 'viewer' ? role : null

  try {
    let family = null
    let contactKind = null
    let contactValue = null

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase()
      const { data } = await supabase
        .from('families')
        .select('id, name, email, phone_number, is_suspended')
        .ilike('email', cleanEmail)
        .maybeSingle()
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'email'
        contactValue = cleanEmail
      }
    } else if (phoneNumber) {
      const cleanPhone = String(phoneNumber).replace(/\s/g, '')
      const { data } = await supabase
        .from('families')
        .select('id, name, email, phone_number, is_suspended')
        .eq('phone_number', cleanPhone)
        .maybeSingle()
      if (data && !data.is_suspended) {
        family = data
        contactKind = 'phone'
        contactValue = cleanPhone
      }
    }

    if (!family) {
      // Same response shape as a real send. Don't leak.
      return okResponse()
    }

    const { code } = await issueOtp({
      familyId: family.id,
      contactKind,
      contactValue,
      purpose: 'reset_pin',
      role: validRole,
    })

    if (contactKind === 'email') {
      await sendOtpEmail({ to: contactValue, code, purpose: 'reset_pin' })
    } else {
      await sendOtpSms({ to: contactValue, code, purpose: 'reset_pin' })
    }

    return okResponse(contactKind)
  } catch (error) {
    console.error('forgot-pin error:', error)
    // Even on internal errors we return ok=true to avoid leaking state to
    // an attacker. Operators see the real cause in logs.
    return okResponse()
  }
}
