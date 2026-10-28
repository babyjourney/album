import crypto from 'crypto'
import { supabase } from './supabaseClient'
import rateLimiter, { HOUR, DAY } from './rateLimiter'
import { normalizePhone } from './phone'

export const FAILURES_PER_HOUR = 10
export const FAILURES_PER_DAY = 30
const RECHECK_MS = 10 * 60 * 1000
const RETENTION_MS = 2 * DAY
const FAILURE_KEY = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'album-login-failures'

const store = { missingUntil: 0, warned: false, prunedAt: 0, deviceMissingUntil: 0, deviceWarned: false }

const hmac = (value) => crypto.createHmac('sha256', FAILURE_KEY).update(String(value)).digest('hex')

export const failureContactHash = (contact) => hmac(contact)

export const failureDeviceHash = (req) =>
  hmac(`device|${rateLimiter.getClientIP(req)}|${req.headers?.['user-agent'] || 'unknown'}`)

const errorText = (error) => `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`

const isMissingDeviceColumn = (error) =>
  !!error && /device_hash/i.test(errorText(error)) &&
  (error.code === '42703' || error.code === 'PGRST204' || /does not exist|could not find/i.test(errorText(error)))

const isMissingTable = (error) =>
  !!error && (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table|relation .* does not exist/i.test(error.message || '')
  )

export const failureStoreOff = () => Date.now() < store.missingUntil

const deviceColumnOn = () => Date.now() >= store.deviceMissingUntil

function storeDown(error) {
  if (isMissingTable(error)) {
    store.missingUntil = Date.now() + RECHECK_MS
    if (!store.warned) {
      store.warned = true
      console.warn('[pin-login] table login_failures is missing (run supabase-migration.sql); PIN failures are limited in memory only')
    }
  } else {
    console.error('[pin-login] login_failures is unavailable, PIN failures are limited in memory only:', error.message || error)
  }
  return { state: 'off', deviceStore: false }
}

function deviceColumnMissing() {
  store.deviceMissingUntil = Date.now() + RECHECK_MS
  if (!store.deviceWarned) {
    store.deviceWarned = true
    console.warn('[pin-login] column login_failures.device_hash is missing (run supabase-migration.sql); the per-device pause is kept in memory only')
  }
}

const contactBuckets = (contact) => [
  rateLimiter.byContact('pin-login-fail-hour', contact, FAILURES_PER_HOUR, HOUR),
  rateLimiter.byContact('pin-login-fail-day', contact, FAILURES_PER_DAY, DAY),
]

const familyBuckets = (familyId) => [
  rateLimiter.byContact('pin-login-fail-family-hour', familyId, FAILURES_PER_HOUR, HOUR),
  rateLimiter.byContact('pin-login-fail-family-day', familyId, FAILURES_PER_DAY, DAY),
]

export const memoryBudgetBuckets = (contact, familyIds) => [
  ...contactBuckets(contact),
  ...familyIds.flatMap(familyBuckets),
]

function readFailures(familyIds, contactHash, withDevice) {
  const query = supabase
    .from('login_failures')
    .select(withDevice ? 'id, family_id, created_at, contact_hash, device_hash' : 'id, family_id, created_at')
    .gte('created_at', new Date(Date.now() - DAY).toISOString())
  const scoped = familyIds.length > 0 ? query.in('family_id', familyIds) : query.eq('contact_hash', contactHash)
  return scoped.order('id', { ascending: true }).limit(1000)
}

async function readWithDevice(familyIds, contactHash) {
  if (deviceColumnOn()) {
    const first = await readFailures(familyIds, contactHash, true)
    if (!first.error) return { data: first.data, error: null, device: true }
    if (!isMissingDeviceColumn(first.error)) return { data: null, error: first.error, device: false }
    deviceColumnMissing()
  }
  const plain = await readFailures(familyIds, contactHash, false)
  return { data: plain.data, error: plain.error, device: false }
}

const withoutDevice = (row) => ({ family_id: row.family_id, contact_hash: row.contact_hash })

async function insertFailures(rows, withDevice) {
  if (withDevice) {
    const first = await supabase.from('login_failures').insert(rows).select('id, family_id')
    if (!first.error) return { data: first.data, error: null, device: true }
    if (!isMissingDeviceColumn(first.error)) return { data: null, error: first.error, device: false }
    deviceColumnMissing()
  }
  const plain = await supabase.from('login_failures').insert(rows.map(withoutDevice)).select('id, family_id')
  return { data: plain.data, error: plain.error, device: false }
}

function retryAfterFor(rows, now) {
  const day = rows.map((row) => new Date(row.created_at).getTime()).sort((a, b) => a - b)
  const hour = day.filter((t) => now - t < HOUR)
  let retryAfterMs = 0
  if (hour.length >= FAILURES_PER_HOUR) {
    retryAfterMs = Math.max(retryAfterMs, hour[hour.length - FAILURES_PER_HOUR] + HOUR - now, 1000)
  }
  if (day.length >= FAILURES_PER_DAY) {
    retryAfterMs = Math.max(retryAfterMs, day[day.length - FAILURES_PER_DAY] + DAY - now, 1000)
  }
  return retryAfterMs
}

function blockedFor(rows, familyIds, before) {
  const now = Date.now()
  const groups = familyIds.length > 0
    ? familyIds.map((id) => rows.filter((row) => row.family_id === id && row.id < (before ? before[id] : Infinity)))
    : [rows.filter((row) => row.id < (before ? before.contact : Infinity))]
  return Math.max(0, ...groups.map((group) => retryAfterFor(group, now)))
}

function deviceTimesOf(rows, familyIds, contactHash, deviceHash) {
  const mine = rows.filter((row) => row.device_hash === deviceHash && row.contact_hash === contactHash)
  const groups = familyIds.length > 0
    ? familyIds.map((id) => mine.filter((row) => row.family_id === id))
    : [mine]
  const smallest = groups.reduce((a, b) => (b.length < a.length ? b : a))
  return smallest
    .map((row) => new Date(row.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
}

export function devicePause(times, now = Date.now()) {
  const { maxAttemptsLevel1: strikes, cooldownLevel1: pauseMs, maxAttemptsLevel2: dayMax } = rateLimiter.config
  const recent = (times || []).filter((t) => now - t < DAY).sort((a, b) => a - b)
  const n = recent.length
  if (n >= dayMax) {
    const until = Math.max(now + 1000, recent[n - dayMax] + DAY)
    return { blocked: true, level: 2, retryAfterMs: until - now, blockedUntil: until, attemptsRemaining: 0 }
  }
  if (n === strikes && recent[n - 1] + pauseMs > now) {
    const until = recent[n - 1] + pauseMs
    return { blocked: true, level: 1, retryAfterMs: until - now, blockedUntil: until, attemptsRemaining: 0 }
  }
  return { blocked: false, attemptsRemaining: n < strikes ? strikes - n : dayMax - n }
}

export async function releaseFailures(ids) {
  if (!ids || ids.length === 0) return
  const { error } = await supabase.from('login_failures').delete().in('id', ids)
  if (error) console.error('[pin-login] could not release a login attempt:', error.message || error)
}

export async function reserveFailureBudget({ familyIds, contactHash, deviceHash }) {
  if (failureStoreOff()) return { state: 'off', deviceStore: false }

  const existing = await readWithDevice(familyIds, contactHash)
  if (existing.error) return storeDown(existing.error)
  const rows = existing.data || []
  const deviceSeen = existing.device ? rows.filter((row) => row.device_hash === deviceHash) : []
  const deviceTimes = existing.device ? deviceTimesOf(rows, familyIds, contactHash, deviceHash) : []
  if (existing.device) {
    const pause = devicePause(deviceTimes)
    if (pause.blocked) return { state: 'paused', pause, deviceStore: true }
  }

  const alreadyBlocked = blockedFor(rows, familyIds, null)
  if (alreadyBlocked) {
    return { state: 'blocked', retryAfterMs: alreadyBlocked, deviceStore: existing.device, deviceTimes, deviceSeen }
  }

  const fresh = familyIds.length > 0
    ? familyIds.map((id) => ({ family_id: id, contact_hash: contactHash, device_hash: deviceHash }))
    : [{ family_id: null, contact_hash: contactHash, device_hash: deviceHash }]
  const inserted = await insertFailures(fresh, existing.device)
  if (inserted.error) return storeDown(inserted.error)
  const mine = inserted.data || []
  const ids = mine.map((row) => row.id)
  const deviceStore = existing.device && inserted.device

  const current = await readFailures(familyIds, contactHash, false)
  if (current.error) {
    console.error('[pin-login] could not re-read login_failures:', current.error.message || current.error)
    return { state: 'reserved', ids, deviceStore, deviceTimes, deviceSeen }
  }
  const before = Object.fromEntries(mine.map((row) => [familyIds.length > 0 ? row.family_id : 'contact', row.id]))
  const overBudget = blockedFor(current.data || [], familyIds, before)
  if (overBudget) {
    await releaseFailures(ids)
    return { state: 'blocked', retryAfterMs: overBudget, deviceStore, deviceTimes, deviceSeen }
  }
  return { state: 'reserved', ids, deviceStore, deviceTimes, deviceSeen }
}

export async function pruneFailures() {
  const now = Date.now()
  if (now - store.prunedAt < HOUR) return
  store.prunedAt = now
  const { error } = await supabase
    .from('login_failures')
    .delete()
    .lt('created_at', new Date(now - RETENTION_MS).toISOString())
  if (error) console.error('[pin-login] could not prune old login failures:', error.message || error)
}

export async function forgiveDevice(familyId, deviceHash) {
  if (!familyId || !deviceHash || failureStoreOff() || !deviceColumnOn()) return
  const { error } = await supabase
    .from('login_failures')
    .update({ device_hash: null })
    .eq('family_id', familyId)
    .eq('device_hash', deviceHash)
  if (error) console.error('[pin-login] could not clear this device\'s earlier wrong PINs:', error.message || error)
}

const familyContacts = (family) => {
  if (!family || typeof family !== 'object') return []
  const email = family.email ? String(family.email).trim().toLowerCase() : ''
  const phone = normalizePhone(family.phone_number)
  return [email, phone].filter(Boolean)
}

export async function clearLoginFailures(family) {
  const familyId = family && typeof family === 'object' ? family.id : family
  if (!familyId) return { ok: false, store: 'unknown' }

  const contacts = familyContacts(family)
  rateLimiter.forget([...familyBuckets(familyId), ...contacts.flatMap(contactBuckets)])
  for (const contact of contacts) rateLimiter.forgetContact(contact)

  if (failureStoreOff()) return { ok: true, store: 'off' }
  const { error } = await supabase.from('login_failures').delete().eq('family_id', familyId)
  if (error) {
    if (isMissingTable(error)) {
      storeDown(error)
      return { ok: true, store: 'off' }
    }
    console.error('[login-failures] could not clear the wrong-PIN count of one family:', error.message || error)
    return { ok: false, store: 'error' }
  }
  return { ok: true, store: 'on' }
}
