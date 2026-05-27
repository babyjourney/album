// OTP issuance + verification helpers backed by the `verification_codes`
// table. Used by:
//   • /api/auth/forgot-pin                  (purpose: 'reset_pin')
//   • /api/auth/verify-reset-otp + reset-pin
//   • /api/auth/request-otp                 (purpose: 'login_2fa')
//   • /api/auth/verify-otp-login
//
// Codes are 6 digits, stored as HMAC-SHA256 with SESSION_SECRET so a DB leak
// doesn't expose live codes. Each row tracks attempts to enable rate
// limiting at the row level (max 5 attempts then mark used).

import crypto from 'crypto'
import { supabase } from './supabaseClient'

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(
    [process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'album-otp-v1'].join('|')
  ).digest('hex')

const TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

function hashCode(code) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(code).digest('hex')
}

function generateCode() {
  // 6-digit zero-padded numeric code, generated from crypto rand bytes so it
  // can't be predicted by a clock-based attacker.
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

// Create + persist a new OTP. Returns the plain code so the caller can
// dispatch it via email/SMS. The plain code is NEVER stored — only its hash.
export async function issueOtp({ familyId, contactKind, contactValue, purpose, role = null }) {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  // Best-effort: invalidate any prior unused codes for the same triple so
  // an old code can't be replayed if the user requests a fresh one.
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('family_id', familyId)
    .eq('contact_value', contactValue)
    .eq('purpose', purpose)
    .eq('used', false)

  const { data, error } = await supabase
    .from('verification_codes')
    .insert({
      family_id: familyId,
      contact_kind: contactKind,
      contact_value: contactValue,
      code_hash: codeHash,
      purpose,
      role,
      expires_at: expiresAt,
      used: false,
      attempts: 0,
    })
    .select('id, expires_at')
    .single()

  if (error) {
    console.error('[otpStore] insert failed:', error)
    throw new Error('Could not issue OTP')
  }

  return { code, otpId: data.id, expiresAt: data.expires_at }
}

// Verify an OTP. Returns { ok, otpRow } on success or { ok:false, error } on
// failure. Increments attempts on miss; marks used on hit.
export async function verifyOtp({ familyId, contactValue, purpose, code }) {
  if (!code || !/^\d{4,8}$/.test(code)) {
    return { ok: false, error: 'Cod invalid' }
  }
  const codeHash = hashCode(code)

  const { data: row, error: fetchError } = await supabase
    .from('verification_codes')
    .select('id, family_id, code_hash, expires_at, used, attempts, role, purpose, contact_value')
    .eq('family_id', familyId)
    .eq('contact_value', contactValue)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError || !row) {
    return { ok: false, error: 'Codul a expirat sau nu există. Cere unul nou.' }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Codul a expirat. Cere unul nou.' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Prea multe încercări. Cere un cod nou.' }
  }

  const isMatch = (() => {
    try {
      const a = Buffer.from(codeHash, 'hex')
      const b = Buffer.from(row.code_hash, 'hex')
      if (a.length !== b.length) return false
      return crypto.timingSafeEqual(a, b)
    } catch {
      return false
    }
  })()

  if (!isMatch) {
    await supabase
      .from('verification_codes')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)
    const remaining = Math.max(0, MAX_ATTEMPTS - (row.attempts + 1))
    return {
      ok: false,
      error: remaining > 0
        ? `Cod greșit. Mai ai ${remaining} încercări.`
        : 'Cod greșit. Cere un cod nou.',
    }
  }

  await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)

  return { ok: true, otpRow: row }
}
