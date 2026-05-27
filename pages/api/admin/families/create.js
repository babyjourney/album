// Admin → create a new family.
//
// Why this endpoint exists: the `families` table is RLS-locked to service_role
// only (see migration.sql §3 — strict RLS for vuln #12). Browsers, even when
// signed in as admin, use the anon key — so direct supabase.from('families')
// .insert(...) from the browser fails with "row violates row-level security".
// All family writes MUST flow through admin API endpoints like this one, which
// run server-side and use the service-role key (see lib/supabaseClient.js).
//
// Input (POST JSON):
//   {
//     name:                string  (required)
//     phoneNumber?:        string  (optional but recommended — Romanian format)
//     email?:              string  (optional — used for OTP delivery)
//     profilePictureUrl?:  string  (optional — set after upload, see update.js)
//     package?:            'free' | 'premium'   (default: 'free')
//     requireOtpLogin?:    boolean              (default: false)
//     viewerPin?:          string  (4 digits — auto-generated if absent)
//     editorPin?:          string  (8 digits — auto-generated if absent)
//   }
//
// Returns: { ok: true, family: { id, name, phone_number, email, viewer_pin,
//           editor_pin, package, require_otp_login, ... } }

import crypto from 'crypto'
import { supabase } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'

const PHONE_REGEX = /^(0)?[67][0-9]{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Generate a numeric PIN whose value is not already taken by another family
// on the given column. Uses crypto.randomInt for unpredictability. Throws
// after MAX_ATTEMPTS — the search space is large enough (10^4 / 10^8) that
// running out implies a corrupted state.
async function generateUniquePin(column, length) {
  const max = 10 ** length
  for (let i = 0; i < 100; i++) {
    const pin = crypto.randomInt(0, max).toString().padStart(length, '0')
    const { data } = await supabase
      .from('families')
      .select('id')
      .eq(column, pin)
      .limit(1)
    if (!data || data.length === 0) return pin
  }
  throw new Error(`Nu s-a putut genera un PIN unic de ${length} cifre`)
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    name,
    phoneNumber,
    email,
    profilePictureUrl,
    package: pkg,
    requireOtpLogin,
    viewerPin: providedViewerPin,
    editorPin: providedEditorPin,
  } = req.body || {}

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Numele familiei este obligatoriu' })
  }

  const cleanName = name.trim()
  const cleanPhone = phoneNumber ? String(phoneNumber).replace(/\s/g, '') : null
  const cleanEmail = email ? String(email).trim().toLowerCase() : null
  const finalPackage = pkg === 'premium' ? 'premium' : 'free'
  const finalRequireOtp = requireOtpLogin === true

  if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
    return res.status(400).json({ error: 'Numărul de telefon nu este valid (format: 061234567)' })
  }
  if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Adresa de email nu este validă' })
  }

  // Custom PIN validation (admin can override auto-gen if they want a
  // memorable one for a specific family — still must be unique).
  let viewerPin = providedViewerPin ? String(providedViewerPin).replace(/\D/g, '') : null
  let editorPin = providedEditorPin ? String(providedEditorPin).replace(/\D/g, '') : null
  if (viewerPin && !/^\d{4}$/.test(viewerPin)) {
    return res.status(400).json({ error: 'PIN-ul de viewer trebuie să aibă 4 cifre' })
  }
  if (editorPin && !/^\d{8}$/.test(editorPin)) {
    return res.status(400).json({ error: 'PIN-ul de editor trebuie să aibă 8 cifre' })
  }

  try {
    // Reject duplicate phone numbers — the login flow keys on phone+PIN, so
    // two families with the same phone would create login ambiguity.
    if (cleanPhone) {
      const { data: existing } = await supabase
        .from('families')
        .select('id')
        .eq('phone_number', cleanPhone)
        .limit(1)
      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: 'O familie cu acest număr de telefon există deja.',
          code: 'PHONE_TAKEN',
        })
      }
    }

    // Verify any admin-supplied PINs aren't already taken.
    if (viewerPin) {
      const { data: clash } = await supabase
        .from('families').select('id').eq('viewer_pin', viewerPin).limit(1)
      if (clash && clash.length > 0) {
        return res.status(409).json({ error: 'Acest PIN de viewer este deja folosit.', code: 'VIEWER_PIN_TAKEN' })
      }
    } else {
      viewerPin = await generateUniquePin('viewer_pin', 4)
    }

    if (editorPin) {
      const { data: clash } = await supabase
        .from('families').select('id').eq('editor_pin', editorPin).limit(1)
      if (clash && clash.length > 0) {
        return res.status(409).json({ error: 'Acest PIN de editor este deja folosit.', code: 'EDITOR_PIN_TAKEN' })
      }
    } else {
      editorPin = await generateUniquePin('editor_pin', 8)
    }

    const insertData = {
      name: cleanName,
      viewer_pin: viewerPin,
      editor_pin: editorPin,
      package: finalPackage,
      require_otp_login: finalRequireOtp,
    }
    if (cleanPhone) insertData.phone_number = cleanPhone
    if (cleanEmail) insertData.email = cleanEmail
    if (profilePictureUrl) insertData.profile_picture_url = profilePictureUrl

    // Insert via service_role (RLS bypass).
    let { data, error } = await supabase
      .from('families')
      .insert(insertData)
      .select()
      .single()

    // Tolerate older deployed schemas that don't yet have the new columns.
    if (error && error.message && (error.message.includes('column') || error.code === '42703')) {
      const fallback = { ...insertData }
      delete fallback.require_otp_login
      ;({ data, error } = await supabase
        .from('families')
        .insert(fallback)
        .select()
        .single())
    }

    if (error) {
      console.error('admin/families/create insert failed:', error)
      return res.status(500).json({ error: `Crearea familiei a eșuat: ${error.message}` })
    }

    return res.status(200).json({ ok: true, family: data })
  } catch (err) {
    console.error('admin/families/create error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAdmin(handler)
