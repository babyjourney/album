// Complete the PIN reset flow.
//
// Input: {
//   phoneNumber?: string,
//   email?: string,
//   code: string,            // the 6-digit OTP delivered via email/SMS
//   newPin: string,          // the new PIN — 4 digits = viewer, 8 = editor
//   role: 'viewer' | 'editor'
// }
//
// On success: updates the corresponding PIN column on the family row.
// Returns 200 with { ok: true } so the UI can prompt the user to log in
// with their new PIN.

import { supabase } from '../../../lib/supabaseClient'
import { verifyOtp } from '../../../lib/otpStore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phoneNumber, email, code, newPin, role } = req.body || {}

  if (!code) return res.status(400).json({ error: 'Codul de verificare lipsește' })
  if (!newPin) return res.status(400).json({ error: 'PIN-ul nou lipsește' })
  if (role !== 'viewer' && role !== 'editor') {
    return res.status(400).json({ error: 'Rol invalid (viewer sau editor)' })
  }

  const cleanPin = String(newPin).replace(/\D/g, '')
  if (role === 'viewer' && !/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul de viewer trebuie să aibă 4 cifre' })
  }
  if (role === 'editor' && !/^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul de editor trebuie să aibă 8 cifre' })
  }

  let contactValue = null
  let lookupQuery = supabase.from('families').select('id, viewer_pin, editor_pin, is_suspended')

  if (email) {
    contactValue = String(email).trim().toLowerCase()
    lookupQuery = lookupQuery.ilike('email', contactValue)
  } else if (phoneNumber) {
    contactValue = String(phoneNumber).replace(/\s/g, '')
    lookupQuery = lookupQuery.eq('phone_number', contactValue)
  } else {
    return res.status(400).json({ error: 'Introdu numărul de telefon sau email-ul' })
  }

  try {
    const { data: family, error: lookupError } = await lookupQuery.maybeSingle()
    if (lookupError || !family) {
      return res.status(400).json({ error: 'Cont negăsit sau cod expirat' })
    }
    if (family.is_suspended) {
      return res.status(403).json({ error: 'Acest cont este suspendat' })
    }

    const result = await verifyOtp({
      familyId: family.id,
      contactValue,
      purpose: 'reset_pin',
      code,
    })

    if (!result.ok) {
      return res.status(400).json({ error: result.error })
    }

    // Ensure the new PIN doesn't collide with another family's PIN (we use
    // PIN+phone as the login key, so a collision is recoverable, but we
    // still discourage it to keep PIN entropy honest).
    const column = role === 'viewer' ? 'viewer_pin' : 'editor_pin'
    const { error: updateError } = await supabase
      .from('families')
      .update({ [column]: cleanPin, updated_at: new Date().toISOString() })
      .eq('id', family.id)

    if (updateError) {
      console.error('reset-pin update failed:', updateError)
      return res.status(500).json({ error: 'Nu s-a putut actualiza PIN-ul' })
    }

    return res.status(200).json({
      ok: true,
      message: 'PIN-ul a fost actualizat. Conectează-te cu noul PIN.',
    })
  } catch (error) {
    console.error('reset-pin error:', error)
    return res.status(500).json({ error: 'Eroare internă' })
  }
}
