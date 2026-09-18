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
import { normalizePhone, phoneLookupVariants } from '../../../lib/phone'
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
      // Any spelling in; E.164 out (what Twilio needs and what reset-pin will
      // look the code up by). Match stored rows in either format.
      const cleanPhone = normalizePhone(phoneNumber)
      if (cleanPhone) {
        const { data } = await supabase
          .from('families')
          .select('id, name, email, phone_number, is_suspended')
          .in('phone_number', phoneLookupVariants(cleanPhone))
          .limit(1)
          .maybeSingle()
        if (data && !data.is_suspended) {
          family = data
          contactKind = 'phone'
          contactValue = cleanPhone
        }
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

    const delivery = contactKind === 'email'
      ? await sendOtpEmail({ to: contactValue, code, purpose: 'reset_pin' })
      : await sendOtpSms({ to: contactValue, code, purpose: 'reset_pin' })

    // Unconfigured delivery in production means the code cannot reach anyone.
    // A plain "not available" beats a "code sent" the user waits on forever —
    // and it does not leak whether the account exists (we'd answer the same
    // for any contact value on this channel).
    if (delivery?.mocked && process.env.NODE_ENV === 'production') {
      console.error(`[forgot-pin] ${contactKind} delivery is not configured (RESEND/TWILIO env)`)
      return res.status(503).json({
        error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'otpDeliveryUnavailable',
      })
    }

    // (Sergiu 18.09) A real send failure (Resend/Twilio rejected the message)
    // is a dead end just like the unconfigured case — don't claim "code sent".
    // The channel being down is systemic, so this leaks nothing per-account.
    if (delivery && delivery.ok === false) {
      console.error(`[forgot-pin] ${contactKind} send FAILED — refusing to claim "code sent"`)
      return res.status(503).json({
        error: 'Trimiterea codului nu este disponibilă momentan. Te rugăm să încerci mai târziu.',
        errorKey: 'otpDeliveryUnavailable',
      })
    }

    return okResponse(contactKind)
  } catch (error) {
    console.error('forgot-pin error:', error)
    // Even on internal errors we return ok=true to avoid leaking state to
    // an attacker. Operators see the real cause in logs.
    return okResponse()
  }
}
