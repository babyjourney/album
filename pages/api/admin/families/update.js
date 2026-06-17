// Admin → update a family.
//
// Same RLS rationale as create.js: the families table is service_role-only,
// so all writes must come through admin endpoints. Updates are partial —
// only the fields included in the request body are mutated.
//
// Input (POST JSON):
//   {
//     id:                  string (required — UUID of the family)
//     name?:               string
//     phoneNumber?:        string  ('' clears the column)
//     email?:              string  ('' clears the column)
//     profilePictureUrl?:  string  ('' clears the column)
//     package?:            'free' | 'premium'
//     requireOtpLogin?:    boolean
//     viewerPin?:          string (4 digits)
//     editorPin?:          string (8 digits)
//   }

import { supabase } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'
import { isValidPackage, normalizeTier } from '../../../../lib/tiers'

const PHONE_REGEX = /^(0)?[67][0-9]{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    id,
    name,
    phoneNumber,
    email,
    profilePictureUrl,
    package: pkg,
    requireOtpLogin,
    viewerPin,
    editorPin,
  } = req.body || {}

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID familie obligatoriu' })
  }

  const patch = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Numele nu poate fi gol' })
    }
    patch.name = name.trim()
  }

  if (phoneNumber !== undefined) {
    const cleanPhone = phoneNumber === null ? null : String(phoneNumber).replace(/\s/g, '')
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Numărul de telefon nu este valid' })
    }
    patch.phone_number = cleanPhone || null
  }

  if (email !== undefined) {
    const cleanEmail = email === null ? null : String(email).trim().toLowerCase()
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Adresa de email nu este validă' })
    }
    patch.email = cleanEmail || null
  }

  if (profilePictureUrl !== undefined) {
    patch.profile_picture_url = profilePictureUrl || null
  }

  if (pkg !== undefined) {
    if (!isValidPackage(pkg)) {
      return res.status(400).json({ error: 'Pachet invalid' })
    }
    patch.package = normalizeTier(pkg)
  }

  if (requireOtpLogin !== undefined) {
    patch.require_otp_login = requireOtpLogin === true
  }

  if (viewerPin !== undefined) {
    const cleaned = String(viewerPin).replace(/\D/g, '')
    if (!/^\d{4}$/.test(cleaned)) {
      return res.status(400).json({ error: 'PIN-ul de viewer trebuie să aibă 4 cifre' })
    }
    // Reject if another family already uses this PIN.
    const { data: clash } = await supabase
      .from('families').select('id').eq('viewer_pin', cleaned).neq('id', id).limit(1)
    if (clash && clash.length > 0) {
      return res.status(409).json({ error: 'Acest PIN este deja folosit', code: 'VIEWER_PIN_TAKEN' })
    }
    patch.viewer_pin = cleaned
  }

  if (editorPin !== undefined) {
    const cleaned = String(editorPin).replace(/\D/g, '')
    if (!/^\d{8}$/.test(cleaned)) {
      return res.status(400).json({ error: 'PIN-ul de editor trebuie să aibă 8 cifre' })
    }
    const { data: clash } = await supabase
      .from('families').select('id').eq('editor_pin', cleaned).neq('id', id).limit(1)
    if (clash && clash.length > 0) {
      return res.status(409).json({ error: 'Acest PIN este deja folosit', code: 'EDITOR_PIN_TAKEN' })
    }
    patch.editor_pin = cleaned
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nimic de actualizat' })
  }

  // Phone uniqueness — login keys on (phone, pin), so duplicates create
  // ambiguity. Refuse to mutate into a duplicate.
  if (patch.phone_number) {
    const { data: clash } = await supabase
      .from('families').select('id').eq('phone_number', patch.phone_number).neq('id', id).limit(1)
    if (clash && clash.length > 0) {
      return res.status(409).json({ error: 'O altă familie are deja acest număr de telefon.', code: 'PHONE_TAKEN' })
    }
  }

  patch.updated_at = new Date().toISOString()

  try {
    let { data, error } = await supabase
      .from('families')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    // Fallback for older deployed schemas missing `require_otp_login`.
    if (error && error.message && error.message.includes('require_otp_login')) {
      const { require_otp_login: _r, ...rest } = patch
      ;({ data, error } = await supabase
        .from('families').update(rest).eq('id', id).select().single())
    }

    if (error) {
      console.error('admin/families/update failed:', error)
      return res.status(500).json({ error: `Actualizarea a eșuat: ${error.message}` })
    }

    return res.status(200).json({ ok: true, family: data })
  } catch (err) {
    console.error('admin/families/update error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAdmin(handler)
