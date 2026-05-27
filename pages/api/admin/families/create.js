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
import { supabase, assertServerHasServiceRole } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'

const PHONE_REGEX = /^(0)?[67][0-9]{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Numeric PIN generator. Falls back to Math.random if crypto.randomInt is
// somehow unavailable (older Node runtimes) — still uniform enough for an
// account PIN, and we re-check uniqueness against the DB anyway.
function randomPin(length) {
  const max = 10 ** length
  let n
  try {
    n = crypto.randomInt(0, max)
  } catch {
    n = Math.floor(Math.random() * max)
  }
  return n.toString().padStart(length, '0')
}

async function generateUniquePin(column, length) {
  for (let i = 0; i < 100; i++) {
    const pin = randomPin(length)
    // .maybeSingle() — returns { data:null, error:null } when no row matches,
    // which is the "this PIN is free" case. Using .limit(1) without
    // .maybeSingle() returns an array, equally fine.
    const { data, error } = await supabase
      .from('families')
      .select('id')
      .eq(column, pin)
      .limit(1)

    if (error) {
      // Service-role queries should always succeed; if this fires we likely
      // don't have SUPABASE_SERVICE_ROLE_KEY set. Bubble up a clear error.
      throw new Error(
        `Nu pot verifica unicitatea PIN-urilor (${error.code || 'unknown'}: ${error.message}). ` +
        `Verifică SUPABASE_SERVICE_ROLE_KEY în .env.local.`
      )
    }
    if (!data || data.length === 0) return pin
  }
  throw new Error(`Nu s-a putut genera un PIN unic de ${length} cifre`)
}

async function handler(req, res) {
  // Single try/catch around EVERYTHING so any thrown error becomes a JSON
  // response instead of a Next.js HTML error page.
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Refuse to proceed without the elevated key — otherwise the insert
    // would hit the RLS policy and return the confusing
    //   "new row violates row-level security policy for table 'families'"
    // error. This guard turns it into a clear, fixable config message.
    const configError = assertServerHasServiceRole()
    if (configError) {
      return res.status(500).json(configError)
    }

    // Defensive: req.body may be undefined (missing Content-Type), a string
    // (body parser disabled), or an object. Handle all three.
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    if (!body || typeof body !== 'object') body = {}

    const {
      name,
      phoneNumber,
      email,
      profilePictureUrl,
      package: pkg,
      requireOtpLogin,
      viewerPin: providedViewerPin,
      editorPin: providedEditorPin,
    } = body

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

    let viewerPin = providedViewerPin ? String(providedViewerPin).replace(/\D/g, '') : null
    let editorPin = providedEditorPin ? String(providedEditorPin).replace(/\D/g, '') : null
    if (viewerPin && !/^\d{4}$/.test(viewerPin)) {
      return res.status(400).json({ error: 'PIN-ul de viewer trebuie să aibă 4 cifre' })
    }
    if (editorPin && !/^\d{8}$/.test(editorPin)) {
      return res.status(400).json({ error: 'PIN-ul de editor trebuie să aibă 8 cifre' })
    }

    // Reject duplicate phone numbers — login keys on phone+PIN.
    if (cleanPhone) {
      const { data: existing, error: phoneErr } = await supabase
        .from('families').select('id').eq('phone_number', cleanPhone).limit(1)
      if (phoneErr) {
        return res.status(500).json({
          error: `Eroare DB la verificare telefon: ${phoneErr.message}`,
          code: phoneErr.code || null,
          hint: 'Probabil SUPABASE_SERVICE_ROLE_KEY lipsește din .env.local.',
        })
      }
      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: 'O familie cu acest număr de telefon există deja.',
          code: 'PHONE_TAKEN',
        })
      }
    }

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

    // Insert via service_role (RLS bypass). On column-missing errors we
    // progressively strip non-essential fields and retry.
    const NON_ESSENTIAL = [
      'require_otp_login', 'package', 'email',
      'profile_picture_url', 'phone_number',
    ]
    let payload = { ...insertData }
    let data, insertError
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await supabase
        .from('families')
        .insert(payload)
        .select()
        .single()
      data = result.data
      insertError = result.error
      if (!insertError) break

      const msg = insertError.message || ''
      const code = insertError.code || ''
      const missingMatch = /column "([^"]+)" .* does not exist/i.exec(msg)
      if (code === '42703' || code === 'PGRST204' || missingMatch || msg.toLowerCase().includes('column')) {
        let stripped = false
        if (missingMatch && payload[missingMatch[1]] !== undefined) {
          delete payload[missingMatch[1]]
          stripped = true
        } else {
          for (const col of NON_ESSENTIAL) {
            if (payload[col] !== undefined) {
              delete payload[col]
              stripped = true
              break
            }
          }
        }
        if (stripped) continue
      }
      break
    }

    if (insertError) {
      console.error('admin/families/create insert failed:', insertError)

      // The RLS error means the Supabase client is running as anon, not
      // service_role. Either SUPABASE_SERVICE_ROLE_KEY is missing (caught
      // by assertServerHasServiceRole above) or it's set to a wrong value
      // (e.g. the user pasted the anon key by mistake). Surface a clear
      // diagnosis instead of the raw postgres message.
      const msg = String(insertError.message || '')
      if (
        msg.includes('row-level security') ||
        insertError.code === '42501' ||
        insertError.code === 'PGRST301'
      ) {
        return res.status(500).json({
          error:
            'Configurare incorectă: cheia SUPABASE_SERVICE_ROLE_KEY din .env.local nu e validă.\n' +
            'Recopiază-o din Supabase Dashboard → Settings → API → service_role secret ' +
            '(NU anon key) și repornește serverul.',
          code: 'INVALID_SERVICE_ROLE_KEY',
          rawCode: insertError.code || null,
          rawMessage: insertError.message,
        })
      }

      return res.status(500).json({
        error: `Crearea familiei a eșuat: ${insertError.message}`,
        code: insertError.code || null,
        hint: insertError.hint || null,
        details: insertError.details || null,
      })
    }

    return res.status(200).json({ ok: true, family: data })
  } catch (err) {
    console.error('admin/families/create unhandled error:', err)
    return res.status(500).json({
      error: err?.message || 'Eroare internă neașteptată',
      where: 'create-family-handler',
    })
  }
}

export default requireAdmin(handler)
