import crypto from 'crypto'
import { supabase } from './supabaseClient'
import { normalizePhone } from './phone'
import { sendOtp, isDeliveryUsable, channelConfigured } from './notifications'

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(
    [process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'album-otp-v1'].join('|')
  ).digest('hex')

const TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DAILY_ISSUE_CAP = { reset_pin: 10, login_2fa: 20 }
export const CODE_LENGTH = 4

function hashCode(code) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(code).digest('hex')
}

function generateCode() {
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH)
  return n.toString().padStart(CODE_LENGTH, '0')
}

export async function issueOtp({ familyId = null, contactKind, contactValue, purpose, role = null, payload = null, invalidatePrevious = true, spent = false }) {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  if (invalidatePrevious) {
    let invalidate = supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('contact_value', contactValue)
      .eq('purpose', purpose)
      .eq('used', false)
    invalidate = familyId ? invalidate.eq('family_id', familyId) : invalidate.is('family_id', null)
    await invalidate
  }

  const row = {
    family_id: familyId,
    contact_kind: contactKind,
    contact_value: contactValue,
    code_hash: codeHash,
    purpose,
    role,
    expires_at: expiresAt,
    used: !!spent,
    attempts: 0,
  }
  if (payload) row.payload = payload

  const { data, error } = await supabase
    .from('verification_codes')
    .insert(row)
    .select('id, expires_at, created_at')
    .single()

  if (error) {
    console.error('[otpStore] insert failed:', error)
    throw new Error('Could not issue OTP')
  }

  return { code, otpId: data.id, expiresAt: data.expires_at, createdAt: data.created_at || null }
}

export async function discardOtp(otpId) {
  if (!otpId) return
  const { error } = await supabase.from('verification_codes').update({ used: true }).eq('id', otpId)
  if (error) console.error('[otpStore] could not discard an undelivered code:', error)
}

export async function withdrawOtp(otpId) {
  if (!otpId) return
  const { error } = await supabase.from('verification_codes').delete().eq('id', otpId)
  if (error) {
    console.error('[otpStore] could not withdraw an unsent code, marking it used instead:', error)
    await discardOtp(otpId)
  }
}

export async function countRecentCodes({ familyId, contactValue, contactKind, purpose, windowMs, until }) {
  let query = supabase
    .from('verification_codes')
    .select('id', { count: 'exact', head: true })
    .eq('purpose', purpose)
    .gte('created_at', new Date(Date.now() - windowMs).toISOString())
  if (until) query = query.lte('created_at', until)
  if (familyId !== undefined) query = familyId ? query.eq('family_id', familyId) : query.is('family_id', null)
  if (contactValue) query = query.eq('contact_value', contactValue)
  if (contactKind) query = query.eq('contact_kind', contactKind)
  const { count, error } = await query
  if (error) {
    console.error(`[otpStore] counting recent ${purpose} codes failed:`, error)
    return { count: 0, error }
  }
  return { count: count || 0, error: null }
}

export async function recentCodeTimes({ familyId, contactValue, contactKind, purpose, windowMs }) {
  let query = supabase
    .from('verification_codes')
    .select('created_at')
    .eq('purpose', purpose)
    .gte('created_at', new Date(Date.now() - windowMs).toISOString())
  if (familyId !== undefined) query = familyId ? query.eq('family_id', familyId) : query.is('family_id', null)
  if (contactValue) query = query.eq('contact_value', contactValue)
  if (contactKind) query = query.eq('contact_kind', contactKind)
  const { data, error } = await query.order('created_at', { ascending: true }).limit(1000)
  if (error) {
    console.error(`[otpStore] reading recent ${purpose} codes failed:`, error)
    return { times: [], error }
  }
  const times = (data || [])
    .map((row) => new Date(row.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  return { times, error: null }
}

export function windowCap(times, { max, windowMs, now = Date.now() }) {
  const inWindow = (times || []).filter((t) => t > now - windowMs)
  if (inWindow.length < max) return { capped: false, count: inWindow.length }
  const freesAt = max > 0 ? inWindow[inWindow.length - max] + windowMs : now + windowMs
  return { capped: true, count: inWindow.length, retryAfterMs: Math.max(1000, freesAt - now) }
}

export function responseFloor(ms) {
  const started = Date.now()
  return () => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms - (Date.now() - started))))
}

export async function otpAttemptBudget({ familyId, purpose, max, windowMs }) {
  if (!familyId) return { blocked: false }
  const { data, error } = await supabase
    .from('verification_codes')
    .select('attempts, created_at')
    .eq('family_id', familyId)
    .eq('purpose', purpose)
    .gt('attempts', 0)
    .gte('created_at', new Date(Date.now() - windowMs).toISOString())
    .order('created_at', { ascending: true })
  if (error) {
    console.error(`[otpStore] reading ${purpose} attempts failed:`, error)
    return { blocked: false }
  }
  const rows = data || []
  let total = rows.reduce((sum, row) => sum + (row.attempts || 0), 0)
  if (total < max) return { blocked: false }
  for (const row of rows) {
    total -= row.attempts || 0
    if (total < max) {
      return { blocked: true, retryAfterMs: Math.max(1000, new Date(row.created_at).getTime() + windowMs - Date.now()) }
    }
  }
  return { blocked: true, retryAfterMs: windowMs }
}

const expiredOrMissing = () => ({
  ok: false,
  error: 'Codul a expirat sau nu există. Cere unul nou.',
  errorKey: 'otpErrExpiredOrMissing',
})

export async function verifyOtp({ familyId = null, contactValue, purpose, code }) {
  if (!code || !/^\d{4,8}$/.test(code)) {
    return { ok: false, error: 'Cod invalid', errorKey: 'otpErrInvalid' }
  }
  const codeHash = hashCode(code)
  const values = (Array.isArray(contactValue) ? contactValue : [contactValue]).filter(Boolean)
  if (values.length === 0) return expiredOrMissing()

  const scoped = (query) => {
    const byContact = values.length > 1 ? query.in('contact_value', values) : query.eq('contact_value', values[0])
    return familyId ? byContact.eq('family_id', familyId) : byContact.is('family_id', null)
  }

  const { data: row, error: fetchError } = await scoped(
    supabase
      .from('verification_codes')
      .select('*')
      .eq('purpose', purpose)
      .eq('used', false)
  )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError || !row) return expiredOrMissing()

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Codul a expirat. Cere unul nou.', errorKey: 'otpErrExpired' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    return { ok: false, error: 'Prea multe încercări. Cere un cod nou.', errorKey: 'otpErrTooManyAttempts' }
  }

  const { data: claimed, error: claimError } = await supabase
    .from('verification_codes')
    .update({ attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('attempts', row.attempts)
    .eq('used', false)
    .select('id')

  if (claimError || !claimed || claimed.length === 0) {
    if (claimError) console.error('[otpStore] could not record a verification attempt:', claimError)
    return { ok: false, error: 'Prea multe încercări. Încearcă din nou mai târziu.', errorKey: 'errRateLimited' }
  }

  const { error: supersedeError } = await scoped(
    supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('purpose', purpose)
      .eq('used', false)
      .neq('id', row.id)
      .lt('created_at', row.created_at)
  )
  if (supersedeError) console.error('[otpStore] could not invalidate older codes:', supersedeError)

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

  const { data: consumed, error: consumeError } = await supabase
    .from('verification_codes')
    .update({ used: true, attempts: row.attempts })
    .eq('id', row.id)
    .eq('used', false)
    .select('id')

  if (consumeError || !consumed || consumed.length === 0) {
    if (consumeError) console.error('[otpStore] could not consume the code:', consumeError)
    return expiredOrMissing()
  }

  return { ok: true, otpRow: row }
}

export function familyOtpTargets(family, kind, value) {
  const targets = []
  if (value) targets.push({ kind, value })
  if (!family) return targets
  const email = family.email ? String(family.email).trim().toLowerCase() : ''
  const phone = normalizePhone(family.phone_number)
  const alternate = kind === 'phone'
    ? (email ? { kind: 'email', value: email } : null)
    : (phone ? { kind: 'phone', value: phone } : null)
  if (alternate && alternate.value !== value) targets.push(alternate)
  return targets
}

export const deliverableTargets = (targets) => (targets || []).filter((target) => channelConfigured(target.kind))

export async function issueAndSendOtp({ familyId = null, targets, purpose, role = null, lang, maxIssuedPerHour = 5, maxIssuedPerDay }) {
  const usable = deliverableTargets(targets)
  if (usable.length === 0) {
    console.error(`[otpStore] ${purpose}: no configured delivery channel for this account (RESEND/TWILIO env)`)
    return { ok: false, reason: 'unconfigured' }
  }

  if (familyId) {
    const dailyMax = Number.isFinite(maxIssuedPerDay) ? maxIssuedPerDay : (DAILY_ISSUE_CAP[purpose] || 10)
    const { times, error } = await recentCodeTimes({ familyId, purpose, windowMs: DAY_MS })
    if (!error) {
      const now = Date.now()
      const hourly = windowCap(times, { max: maxIssuedPerHour, windowMs: HOUR_MS, now })
      const daily = windowCap(times, { max: dailyMax, windowMs: DAY_MS, now })
      if (hourly.capped || daily.capped) {
        console.warn(hourly.capped
          ? `[otpStore] ${purpose}: ${hourly.count} codes issued for one family in the last hour, not sending another`
          : `[otpStore] ${purpose}: ${daily.count} codes issued for one family in the last 24 hours, not sending another`)
        return {
          ok: false,
          reason: 'capped',
          retryAfterMs: Math.max(hourly.capped ? hourly.retryAfterMs : 0, daily.capped ? daily.retryAfterMs : 0),
        }
      }
    }
    const { error: invalidateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('family_id', familyId)
      .eq('purpose', purpose)
      .eq('used', false)
    if (invalidateError) console.error(`[otpStore] ${purpose}: could not invalidate previous codes:`, invalidateError)
  }

  for (const target of usable) {
    const { code, otpId } = await issueOtp({
      familyId,
      contactKind: target.kind,
      contactValue: target.value,
      purpose,
      role,
      invalidatePrevious: !familyId,
    })
    const delivery = await sendOtp({ kind: target.kind, to: target.value, code, purpose, lang })
    if (isDeliveryUsable(delivery)) {
      return { ok: true, kind: target.kind, value: target.value, code, mocked: !!delivery.mocked }
    }
    await discardOtp(otpId)
    console.error(`[otpStore] ${purpose} ${target.kind} delivery failed${delivery?.mocked ? ' (not configured)' : ''}`)
  }
  return { ok: false, reason: 'failed' }
}
