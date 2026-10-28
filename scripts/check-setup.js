const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.local')
const env = { ...process.env }
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    if (!(k in env)) env[k] = t.slice(i + 1).trim()
  }
}

const { createClient } = require(path.join(root, 'node_modules', '@supabase', 'supabase-js'))

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local')
  process.exit(2)
}
const sb = createClient(URL, KEY)

const STORAGE_MAX_UPLOAD_MB = 200
const SUPABASE_DEFAULT_UPLOAD_MB = 50
const RETIRED = { memories: 'everyday', special: 'milestones', play: 'adventures', learning: 'education' }
const NEW_DEFAULTS = [
  ['milestones', 'Milestones', '🎯'], ['family', 'Family', '👨‍👩‍👧‍👦'], ['health', 'Health', '🏥'],
  ['education', 'Education', '📚'], ['adventures', 'Adventures', '🌍'], ['everyday', 'Everyday Life', '☀️'],
]
const REQUIRED_COLUMNS = [
  ['photos', 'uploaded_at'], ['photos', 'poster_urls'], ['photos', 'file_sizes'],
  ['skills_progress', 'child_id'], ['life_chapters', 'description'], ['life_chapters', 'hashtags'],
  ['verification_codes', 'payload'], ['families', 'self_registered'],
]
const REQUIRED_TABLES = ['login_failures']
const REQUIRED_TABLE_COLUMNS = [['login_failures', 'device_hash']]
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const PIN_FAILURES_PER_HOUR = 10
const PIN_FAILURES_PER_DAY = 30

const fix = process.argv.includes('--fix')

async function readFamilyReach({ email, sms, bypass }) {
  const read = (cols) => sb.from('families').select(cols).order('name')
  let { data, error } = await read('name, email, phone_number, require_otp_login, is_suspended, self_registered')
  if (error && /self_registered/i.test(error.message || '')) {
    ;({ data, error } = await read('name, email, phone_number, require_otp_login, is_suspended'))
  }
  if (error) return null
  const has = (v) => !!String(v ?? '').trim()
  const families = (data || []).filter((f) => !f.is_suspended).map((f) => ({
    name: String(f.name || '').trim() || '—',
    email: has(f.email),
    phone: has(f.phone_number),
    otp: !!f.require_otp_login,
    self: !!f.self_registered,
  }))
  const reachable = (f) => (email && f.email) || (sms && f.phone)
  const needsCode = (f, bp) => f.otp && !(bp && !f.self)
  return {
    withoutEmail: families.filter((f) => !f.email),
    withoutPhone: families.filter((f) => !f.phone),
    loginBlocked: families.filter((f) => needsCode(f, bypass) && !reachable(f)),
    blockedWithoutBypass: families.filter((f) => needsCode(f, false) && !reachable(f)),
  }
}
const ok = (b) => (b ? '✅' : '❌')

async function readPinLockouts({ email, sms }) {
  const now = Date.now()
  const byFamily = new Map()
  for (let page = 0; page < 20; page++) {
    const { data, error } = await sb.from('login_failures')
      .select('family_id, created_at')
      .not('family_id', 'is', null)
      .gte('created_at', new Date(now - DAY_MS).toISOString())
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999)
    if (error) return null
    for (const row of data || []) {
      const times = byFamily.get(row.family_id) || []
      times.push(new Date(row.created_at).getTime())
      byFamily.set(row.family_id, times)
    }
    if (!data || data.length < 1000) break
  }
  const locked = []
  for (const [id, times] of byFamily) {
    const day = times.sort((a, b) => a - b)
    const hour = day.filter((t) => now - t < HOUR_MS)
    let until = 0
    if (hour.length >= PIN_FAILURES_PER_HOUR) until = Math.max(until, hour[hour.length - PIN_FAILURES_PER_HOUR] + HOUR_MS)
    if (day.length >= PIN_FAILURES_PER_DAY) until = Math.max(until, day[day.length - PIN_FAILURES_PER_DAY] + DAY_MS)
    if (until > now) locked.push({ id, until })
  }
  if (!locked.length) return []
  const { data: fams, error } = await sb.from('families').select('id, name, email, phone_number, is_suspended').in('id', locked.map((l) => l.id))
  if (error) return null
  const has = (v) => !!String(v ?? '').trim()
  const known = new Map((fams || []).filter((f) => !f.is_suspended).map((f) => [f.id, f]))
  return locked.filter((l) => known.has(l.id)).map((l) => {
    const f = known.get(l.id)
    return { name: String(f.name || '').trim() || '—', until: l.until, reachable: (email && has(f.email)) || (sms && has(f.phone_number)) }
  }).sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

async function main() {
  console.log(`\nBabyJourney setup check — ${URL}\n`)
  let pending = 0

  const { error: ping } = await sb.from('families').select('id', { head: true, count: 'exact' })
  if (ping) {
    console.log(`❌ Supabase unreachable: ${ping.message}`)
    console.log('   → Free tier pauses after ~7 days idle: Supabase dashboard → Restore project.\n')
    process.exit(1)
  }
  console.log('✅ Supabase reachable')

  const missing = []
  for (const [t, c] of REQUIRED_COLUMNS) {
    const { error } = await sb.from(t).select(c).limit(1)
    if (error) missing.push(`${t}.${c}`)
  }
  console.log(`${ok(!missing.length)} SQL migration supabase-migration.sql ${missing.length ? `— missing: ${missing.join(', ')}` : '— applied'}`)
  if (missing.length) {
    pending++
    console.log('   → Supabase → SQL Editor → New query → paste supabase-migration.sql → Run  (idempotent, safe to re-run)')
  }

  const missingTables = []
  for (const t of REQUIRED_TABLES) {
    const { error } = await sb.from(t).select('id').limit(1)
    if (error) missingTables.push(t)
  }
  const missingTableColumns = []
  for (const [t, c] of REQUIRED_TABLE_COLUMNS) {
    if (missingTables.includes(t)) continue
    const { error } = await sb.from(t).select(c).limit(1)
    if (error) missingTableColumns.push(`${t}.${c}`)
  }
  const technicalMissing = [...missingTables, ...missingTableColumns]
  console.log(`${ok(!technicalMissing.length)} Tables from supabase-migration.sql (technical) ${technicalMissing.length ? `— missing: ${technicalMissing.join(', ')}` : '— present'}`)
  if (technicalMissing.length) {
    pending++
    console.log('   → re-run supabase-migration.sql in Supabase → SQL Editor (idempotent, safe to re-run)')
    if (missingTables.includes('login_failures')) console.log('   · until then PIN-failure limits live in each serverless instance\'s memory only; Vercel logs "[pin-login] table login_failures is missing …" once per instance')
    if (missingTableColumns.includes('login_failures.device_hash')) console.log('   · until then the per-device pause (5 wrong PINs → 10 min, 10 in 24 h → 24 h) lives in each instance\'s memory only; Vercel logs "[pin-login] column login_failures.device_hash is missing …" once per instance')
  }

  const retired = Object.keys(RETIRED)
  const { count: retiredRows } = await sb.from('family_categories').select('*', { count: 'exact', head: true }).in('category_value', retired)
  const { count: retiredPosts } = await sb.from('photos').select('*', { count: 'exact', head: true }).in('category', retired)
  let catsOk = !(retiredRows || retiredPosts)
  if (!catsOk && fix) {
    console.log(`…  migrating categories (${retiredRows} rows, ${retiredPosts} posts)`)
    for (const [o, n] of Object.entries(RETIRED)) {
      const { error } = await sb.from('photos').update({ category: n }).eq('category', o)
      if (error) throw error
    }
    const { data: fams } = await sb.from('families').select('id')
    for (const f of fams || []) {
      const { data: rows } = await sb.from('family_categories').select('category_value').eq('family_id', f.id)
      if (!rows || !rows.length) continue
      if (!rows.some(r => RETIRED[r.category_value])) continue
      const have = new Set(rows.map(r => r.category_value))
      await sb.from('family_categories').delete().eq('family_id', f.id).in('category_value', retired)
      const ins = NEW_DEFAULTS.filter(([v]) => !have.has(v)).map(([v, l, e]) => ({ family_id: f.id, category_value: v, category_label: l, category_emoji: e }))
      if (ins.length) { const { error } = await sb.from('family_categories').insert(ins); if (error && !/duplicate/i.test(error.message)) throw error }
    }
    catsOk = true
  }
  console.log(`${ok(catsOk)} New category set ${catsOk ? '— all families migrated' : `— ${retiredRows} old category rows, ${retiredPosts} posts on old ids (run with --fix, or let the app self-heal on next load)`}`)
  if (!catsOk) pending++

  const { data: bucket, error: bErr } = await sb.storage.getBucket('album_uploads')
  const limitMB = bucket?.file_size_limit ? Math.round(bucket.file_size_limit / 1024 / 1024) : null
  const effective = limitMB || SUPABASE_DEFAULT_UPLOAD_MB
  const storageOk = !bErr && effective >= STORAGE_MAX_UPLOAD_MB
  console.log(`${ok(storageOk)} Storage upload limit ${bErr ? `— cannot read bucket: ${bErr.message}` : `— bucket album_uploads: ${limitMB ? limitMB + ' MB' : 'no own limit → project default ' + SUPABASE_DEFAULT_UPLOAD_MB + ' MB'} (need ≥ ${STORAGE_MAX_UPLOAD_MB} MB)`}`)
  if (!storageOk) {
    pending++
    console.log(`   → Supabase → Settings → Storage → Upload file size limit → ${STORAGE_MAX_UPLOAD_MB} MB, then run the SQL migration (it sets the bucket limit)`)
  }

  const email = !!env.RESEND_API_KEY
  const sms = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER)
  const bypass = env.LOGIN_OTP_BYPASS === 'true'
  const sender = env.RESEND_FROM_EMAIL || 'BabyJourney <noreply@babyjourney.life> (default)'
  const conciergeTo = env.ADMIN_NOTIFY_EMAIL || 'concierge@babyjourney.life (default — set ADMIN_NOTIFY_EMAIL to your own inbox)'
  const cap = (name, fallback) => {
    const n = parseInt(env[name] || '', 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  const reach = await readFamilyReach({ email, sms, bypass })
  const names = (list) => (list.length ? list.map((f) => `"${f.name}"`).join(', ') : 'none')

  console.log(`${ok(email)} Email (Resend) ${email ? `— configured · sender ${sender} · Legacy concierge requests → ${conciergeTo} · signup emails capped at ${cap('SIGNUP_EMAIL_DAILY_CAP', 80)}/day` : '— RESEND_API_KEY missing → no email is sent (codes, Legacy concierge requests)'}`)
  if (!email) {
    pending++
    console.log('   → set RESEND_API_KEY in Vercel env (domain babyjourney.life must be Verified in Resend); optional: RESEND_FROM_EMAIL, ADMIN_NOTIFY_EMAIL, SIGNUP_EMAIL_DAILY_CAP (default 80) — see NOTIFICATIONS.md')
    console.log(sms
      ? '   · signup works by SMS only; PIN-reset / login codes go by SMS (families without a phone on file get none)'
      : '   · /signup answers "signup unavailable" and forgot-PIN answers "code delivery unavailable" (neither email nor SMS works)')
    console.log('   · Legacy concierge requests (poster, yearbook, migration…) are refused with "temporarily unavailable" — the family is told to retry')
  }
  if (reach) console.log(`   · families without an email on file: ${names(reach.withoutEmail)}`)

  console.log(`${ok(sms)} SMS (Twilio) ${sms ? `— configured · signup SMS capped at ${cap('SIGNUP_SMS_DAILY_CAP', 300)}/day` : '— TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing → no SMS is sent'}`)
  if (!sms) {
    pending++
    console.log('   → set TWILIO_* in Vercel env (a sender that can deliver to Moldova), see NOTIFICATIONS.md; optional: SIGNUP_SMS_DAILY_CAP (default 300)')
    console.log('   → Twilio Console → Messaging → Settings → Geo permissions: allow only the SMS-signup countries (MD, RO, RU, UA, IT, DE, FR, ES, PT, GB, US/CA) or fewer')
    console.log(email
      ? '   · signup works by email only (the SMS option suggests email); PIN-reset / login codes go by email (families without an email on file get none)'
      : '   · SMS cannot stand in for email either — connecting either provider enables signup and PIN reset')
  }
  if (reach) console.log(`   · families without a phone on file: ${names(reach.withoutPhone)}`)

  if (reach) {
    const locked = reach.loginBlocked.length > 0
    console.log(`${ok(!locked)} Login codes ${locked ? `— ${reach.loginBlocked.length} famil${reach.loginBlocked.length === 1 ? 'y' : 'ies'} with require_otp_login cannot receive a code and cannot log in: ${names(reach.loginBlocked)}` : '— every family that needs a login code can receive one'}`)
    if (locked) {
      pending++
      if (!bypass && reach.loginBlocked.some((f) => !f.self)) console.log('   → immediate fix for admin-created families: LOGIN_OTP_BYPASS=true in Vercel env → Redeploy')
      if (!email || !sms) console.log(`   → lasting fix: connect ${!email && !sms ? 'email or SMS' : !email ? 'email' : 'SMS'}${email || sms ? ', or add the missing contact (Supabase → Table Editor → families)' : ''}`)
      if (reach.loginBlocked.some((f) => f.self)) console.log('   · self-registered families are never bypassed: they need the channel they signed up with')
    }
  } else {
    console.log('❔ Login codes — could not read the families table')
  }

  const lockouts = missingTables.includes('login_failures') ? null : await readPinLockouts({ email, sms })
  if (lockouts) {
    const when = (t) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    console.log(`${ok(!lockouts.length)} PIN lockouts ${lockouts.length ? `— ${lockouts.length} famil${lockouts.length === 1 ? 'y' : 'ies'} paused after ${PIN_FAILURES_PER_HOUR} wrong PINs in an hour or ${PIN_FAILURES_PER_DAY} in a day:` : '— no family is paused after wrong PINs'}`)
    for (const f of lockouts) {
      console.log(`   · "${f.name}" until ${when(f.until)} — ${f.reachable ? 'can still log in: the correct PIN gets a login code' : 'no configured channel reaches it: cannot log in until then'}`)
    }
    if (lockouts.length) {
      pending++
      console.log('   → /admin/dashboard → "Deblochează" next to the family (deletes its login_failures rows); a login with the code or a successful PIN reset lifts the pause too')
    }
  }

  if (email || sms) {
    const via = email && sms ? 'by email or SMS' : email ? 'by email' : 'by SMS'
    console.log(`${ok(!bypass)} Login 2FA ${bypass ? `— LOGIN_OTP_BYPASS=true (admin-created families skip the code; self-registered families still get it ${via})` : '— active'}`)
    if (bypass) {
      pending++
      console.log(`   → once a test code arrives ${via}: LOGIN_OTP_BYPASS=false in Vercel env → Redeploy`)
      if (reach) {
        const wouldLock = reach.blockedWithoutBypass.filter((f) => !reach.loginBlocked.includes(f))
        if (wouldLock.length) console.log(`   ! with LOGIN_OTP_BYPASS=false these families could no longer log in (no contact on a configured channel): ${names(wouldLock)}`)
        else if (!reach.blockedWithoutBypass.length) console.log('   · every family with require_otp_login has a contact on a configured channel')
      }
    }
  } else if (bypass) {
    console.log('   · LOGIN_OTP_BYPASS=true → login 2FA is off for admin-created families (expected until email or SMS works)')
  }

  console.log(`\n${pending === 0 ? '🎉 Everything is set up.' : `${pending} step(s) pending.`}  (env checks reflect this machine; verify the same vars exist in Vercel → Settings → Environment Variables)\n`)
  process.exit(pending === 0 ? 0 : 1)
}

main().catch((e) => { console.error('check failed:', e.message || e); process.exit(2) })
