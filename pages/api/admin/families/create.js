import crypto from 'crypto'
import { supabase, assertServerHasServiceRole } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'
import { normalizeTier } from '../../../../lib/tiers'
import { normalizePhone, phoneLookupVariants } from '../../../../lib/phone'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isNetworkError(err) {
  const m = String(err?.message || err || '').toLowerCase()
  return m.includes('fetch failed') || m.includes('econnrefused') ||
         m.includes('enotfound') || m.includes('getaddrinfo') ||
         m.includes('network') || m.includes('timed out') || m.includes('etimedout')
}
const NETWORK_HINT =
  'Serverul nu poate contacta Supabase. Verifică: (1) proiectul Supabase nu e ' +
  'pus pe pauză (Dashboard → Restore), (2) repornește serverul după modificări ' +
  'în .env.local, (3) rețea/VPN/firewall care blochează conexiunile Node.'

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
    const { data, error } = await supabase
      .from('families')
      .select('id')
      .eq(column, pin)
      .limit(1)

    if (error) {
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
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const configError = assertServerHasServiceRole()
    if (configError) {
      return res.status(500).json(configError)
    }

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
    const rawPhone = phoneNumber ? String(phoneNumber).replace(/\s/g, '') : null
    const cleanPhone = rawPhone ? normalizePhone(rawPhone) : null
    const cleanEmail = email ? String(email).trim().toLowerCase() : null
    const finalPackage = normalizeTier(pkg)
    const finalRequireOtp = requireOtpLogin === true

    if (rawPhone && !cleanPhone) {
      return res.status(400).json({ error: 'Numărul de telefon nu este valid (ex. 069010712 sau +37369010712)' })
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

    if (cleanPhone) {
      const { data: existing, error: phoneErr } = await supabase
        .from('families').select('id').in('phone_number', phoneLookupVariants(cleanPhone)).limit(1)
      if (phoneErr) {
        const network = isNetworkError(phoneErr)
        return res.status(network ? 503 : 500).json({
          error: network
            ? `Nu se poate conecta la Supabase (${phoneErr.message}).`
            : `Eroare DB la verificare telefon: ${phoneErr.message}`,
          code: phoneErr.code || (network ? 'SUPABASE_UNREACHABLE' : null),
          hint: network ? NETWORK_HINT : 'Probabil SUPABASE_SERVICE_ROLE_KEY lipsește din .env.local.',
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
    const network = isNetworkError(err)
    return res.status(network ? 503 : 500).json({
      error: network
        ? `Nu se poate conecta la Supabase (${err?.message}).`
        : (err?.message || 'Eroare internă neașteptată'),
      code: network ? 'SUPABASE_UNREACHABLE' : undefined,
      hint: network ? NETWORK_HINT : undefined,
      where: 'create-family-handler',
    })
  }
}

export default requireAdmin(handler)
