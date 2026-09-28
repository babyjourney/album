import crypto from 'crypto'
import { supabase } from './supabaseClient'

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(
    [process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'album-otp-v1'].join('|')
  ).digest('hex')

const TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
export const CODE_LENGTH = 4

function hashCode(code) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(code).digest('hex')
}

function generateCode() {
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH)
  return n.toString().padStart(CODE_LENGTH, '0')
}

export async function issueOtp({ familyId = null, contactKind, contactValue, purpose, role = null, payload = null }) {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  let invalidate = supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('contact_value', contactValue)
    .eq('purpose', purpose)
    .eq('used', false)
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

export async function verifyOtp({ familyId = null, contactValue, purpose, code }) {
  if (!code || !/^\d{4,8}$/.test(code)) {
    return { ok: false, error: 'Cod invalid', errorKey: 'otpErrInvalid' }
  }
  const codeHash = hashCode(code)

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
    return { ok: false, error: 'Codul a expirat sau nu există. Cere unul nou.', errorKey: 'otpErrExpiredOrMissing' }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Codul a expirat. Cere unul nou.', errorKey: 'otpErrExpired' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Prea multe încercări. Cere un cod nou.', errorKey: 'otpErrTooManyAttempts' }
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
      errorKey: remaining > 0 ? 'otpErrWrongCode' : 'otpErrWrongCodeRequestNew',
      attemptsRemaining: remaining,
    }
  }

  await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)

  return { ok: true, otpRow: row }
}
