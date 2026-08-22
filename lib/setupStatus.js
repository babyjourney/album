import { supabase } from './supabaseClient'
import { LEGACY_CATEGORY_REMAP } from './defaultCategories'
import { STORAGE_MAX_UPLOAD_MB } from './tiers'

// One place that answers "is this deployment fully set up?".
//
// This project has no migration runner: schema changes are SQL files under
// sql/ that someone pastes into the Supabase editor, and email/SMS delivery
// needs keys in the Vercel env. Each of those was "done" in conversation
// several times while the live project still lacked it, and every missing piece
// surfaces to the client as a feature that "doesn't work". So the app checks
// itself: scripts/check-setup.js prints this from the terminal, the admin
// dashboard shows it as a banner, and /api/admin/setup-status serves it.
//
// Server-only (uses the service-role client). Keep the list in sync with
// scripts/check-setup.js, which cannot import ESM modules.

// Supabase's project-wide default when a bucket has no explicit limit (Free plan).
const SUPABASE_DEFAULT_UPLOAD_MB = 50

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)
  return !error
}

export const REQUIRED_COLUMNS = [
  // [table, column, what breaks without it]
  ['photos', 'uploaded_at', 'Dashboard: data reală a postării (acum dedusă din numele fișierului — funcționează, dar coloana rămâne sursa corectă)'],
  ['photos', 'poster_urls', 'Miniaturi video salvate la încărcare (fără ea: captură în browser, mai lentă)'],
  ['photos', 'file_sizes', 'Spațiu utilizat real per postare (fără ea: estimare 2MB/fișier)'],
  ['skills_progress', 'child_id', 'Skills per copil (fără ea: skills comune pe familie)'],
  ['life_chapters', 'description', 'Journey → capitole cu descriere multilinie'],
  ['life_chapters', 'hashtags', 'Journey → capitole sincronizate cu hashtag-uri'],
  ['verification_codes', 'payload', 'Înregistrare self-service (signup) — BLOCATĂ fără ea'],
  ['families', 'self_registered', 'Marcaj familii înregistrate singure + 2FA la login'],
]

export async function getSetupStatus() {
  const checks = []

  // ── 1. schema: sql/sergiu_batch2.sql ──────────────────────────────────
  const missing = []
  for (const [table, column, why] of REQUIRED_COLUMNS) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await columnExists(table, column))) missing.push({ table, column, why })
  }
  checks.push({
    key: 'sql_batch2',
    ok: missing.length === 0,
    label: 'Migrarea SQL sql/sergiu_batch2.sql',
    detail: missing.length
      ? `Lipsesc ${missing.length} coloane: ${missing.map(m => `${m.table}.${m.column}`).join(', ')}`
      : 'Toate coloanele există',
    action: 'Supabase → SQL Editor → New query → lipește conținutul din sql/sergiu_batch2.sql → Run',
    missing,
  })

  // ── 2. categories: retired ids still in use? ─────────────────────────
  const retired = Object.keys(LEGACY_CATEGORY_REMAP)
  const [{ count: retiredRows }, { count: retiredPosts }] = await Promise.all([
    supabase.from('family_categories').select('*', { count: 'exact', head: true }).in('category_value', retired),
    supabase.from('photos').select('*', { count: 'exact', head: true }).in('category', retired),
  ])
  checks.push({
    key: 'categories',
    ok: !(retiredRows || retiredPosts),
    label: 'Noul set de categorii (Milestones · Family · Health · Education · Adventures · Everyday Life)',
    detail: (retiredRows || retiredPosts)
      ? `${retiredRows || 0} categorii vechi și ${retiredPosts || 0} postări încă pe vechiul set`
      : 'Toate familiile folosesc noul set',
    action: 'Se repară singur la prima deschidere a albumului de către familie; sau POST /api/admin/migrate-categories; sau migrarea SQL',
  })

  // ── 3. storage bucket limit ──────────────────────────────────────────
  let bucketLimitMB = null
  let bucketErr = null
  try {
    const { data, error } = await supabase.storage.getBucket('album_uploads')
    if (error) bucketErr = error.message
    else bucketLimitMB = data?.file_size_limit ? Math.round(data.file_size_limit / 1024 / 1024) : null
  } catch (e) { bucketErr = e.message }
  const effectiveMB = bucketLimitMB || SUPABASE_DEFAULT_UPLOAD_MB
  checks.push({
    key: 'storage_limit',
    ok: !bucketErr && effectiveMB >= STORAGE_MAX_UPLOAD_MB,
    label: `Limita de upload a bucket-ului album_uploads (≥ ${STORAGE_MAX_UPLOAD_MB} MB)`,
    detail: bucketErr
      ? `Nu s-a putut citi bucket-ul: ${bucketErr}`
      : (bucketLimitMB
          ? `Limita bucket: ${bucketLimitMB} MB`
          : `Bucket fără limită proprie → se aplică limita globală a proiectului (implicit ${SUPABASE_DEFAULT_UPLOAD_MB} MB)`),
    action: `Supabase → Settings → Storage → "Upload file size limit" → ${STORAGE_MAX_UPLOAD_MB} MB, apoi rulează (sau re-rulează) migrarea SQL care setează limita bucket-ului`,
    bucketLimitMB,
  })

  // ── 4. email (Resend) ────────────────────────────────────────────────
  const emailConfigured = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
  checks.push({
    key: 'email',
    ok: emailConfigured,
    label: 'Email (Resend) — coduri de înregistrare / 2FA / resetare PIN',
    detail: emailConfigured ? 'RESEND_API_KEY + RESEND_FROM_EMAIL setate' : 'RESEND_API_KEY / RESEND_FROM_EMAIL lipsesc → codurile NU se trimit (mod mock)',
    action: 'Vercel → Project → Settings → Environment Variables: RESEND_API_KEY, RESEND_FROM_EMAIL (vezi NOTIFICATIONS.md) → Redeploy',
  })

  // ── 5. SMS (Twilio) ──────────────────────────────────────────────────
  const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)
  checks.push({
    key: 'sms',
    ok: smsConfigured,
    label: 'SMS (Twilio) — coduri pe telefon',
    detail: smsConfigured ? 'TWILIO_* setate' : 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER lipsesc → SMS-urile NU pleacă',
    action: 'Vercel → Environment Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (vezi NOTIFICATIONS.md) → Redeploy',
  })

  // ── 6. login 2FA bypass ──────────────────────────────────────────────
  const bypass = String(process.env.LOGIN_OTP_BYPASS || '').toLowerCase() === 'true'
  checks.push({
    key: 'otp_bypass',
    ok: !bypass,
    label: '2FA la login activ (LOGIN_OTP_BYPASS dezactivat)',
    detail: bypass ? 'LOGIN_OTP_BYPASS=true → codul de login NU este cerut familiilor create de admin' : '2FA la login este activ',
    action: 'DOAR după ce emailul funcționează: Vercel → Environment Variables → LOGIN_OTP_BYPASS=false → Redeploy',
  })

  const pending = checks.filter(c => !c.ok)
  return {
    ok: pending.length === 0,
    pendingCount: pending.length,
    checks,
    checkedAt: new Date().toISOString(),
  }
}
