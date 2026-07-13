// OTP issuance + verification helpers backed by the `verification_codes`
// table. Used by:
//   • /api/auth/forgot-pin                  (purpose: 'reset_pin')
//   • /api/auth/verify-reset-otp + reset-pin
//   • /api/auth/request-otp                 (purpose: 'login_2fa')
//   • /api/auth/signup-request + signup-verify  (purpose: 'signup')
//
// Codes are 4 digits (item 14 — "vine email cu 4 cifre"), stored as
// HMAC-SHA256 with SESSION_SECRET so a DB leak doesn't expose live codes.
//
// 4 digits is only 10,000 combinations, so the per-row attempt counter is the
// thing keeping this safe: 5 wrong guesses burns the code, and it expires after
// 10 minutes regardless. Callers are additionally rate-limited by IP.

import crypto from 'crypto'
import { supabase } from './supabaseClient'

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(
    [process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'album-otp-v1'].join('|')
  ).digest('hex')

const TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5
export const CODE_LENGTH = 4

function hashCode(code) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(code).digest('hex')
}

function generateCode() {
  // Zero-padded numeric code from crypto rand, so it can't be predicted by a
  // clock-based attacker.
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH)
  return n.toString().padStart(CODE_LENGTH, '0')
}

// Create + persist a new OTP. Returns the plain code so the caller can
// dispatch it via email/SMS. The plain code is NEVER stored — only its hash.
//
// familyId is null for purpose='signup' — the family doesn't exist until the
// code is verified, so the pending registration rides along in `payload`.
export async function issueOtp({ familyId = null, contactKind, contactValue, purpose, role = null, payload = null }) {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  // Best-effort: invalidate any prior unused codes for the same triple so
  // an old code can't be replayed if the user requests a fresh one.
  let invalidate = supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('contact_value', contactValue)
    .eq('purpose', purpose)
    .eq('used', false)
  // .eq() against NULL never matches in SQL — signup rows need IS NULL.
  invalidate = familyId ? invalidate.eq('family_id', familyId) : invalidate.is('family_id', null)
  await invalidate

  const row = {
    family_id: familyId,
    contact_kind: contactKind,
    contact_value: contactValue,
    code_hash: codeHash,
    purpose,
    role,
    expires_at: expiresAt,
    used: false,
    attempts: 0,
  }
  if (payload) row.payload = payload

  const { data, error } = await supabase
    .from('verification_codes')
    .insert(row)
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
//
// familyId is null for purpose='signup' (the family doesn't exist yet); the
// lookup then matches on the email alone.
export async function verifyOtp({ familyId = null, contactValue, purpose, code }) {
  if (!code || !/^\d{4,8}$/.test(code)) {
    return { ok: false, error: 'Cod invalid' }
  }
  const codeHash = hashCode(code)

  // select('*') rather than naming `payload` explicitly: the column arrives with
  // sql/sergiu_batch2.sql, and naming it would break reset_pin / login_2fa on a
  // deployment that hasn't run the migration yet.
  let query = supabase
    .from('verification_codes')
    .select('*')
    .eq('contact_value', contactValue)
    .eq('purpose', purpose)
    .eq('used', false)
  query = familyId ? query.eq('family_id', familyId) : query.is('family_id', null)

  const { data: row, error: fetchError } = await query
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
