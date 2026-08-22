#!/usr/bin/env node
// Prints what is still missing on the LIVE Supabase project + env for this app
// to be fully functional, and (with --fix) applies the parts that are plain
// data changes. Run from the repo root:
//
//     npm run check:setup            # report only
//     npm run check:setup -- --fix   # also migrate categories (DML only)
//
// Reads .env.local (URL + service role). Schema changes (new columns, bucket
// limit) can NOT be applied from here — Supabase exposes no SQL over REST —
// those stay manual: paste sql/sergiu_batch2.sql into the Supabase SQL editor.
//
// Mirrors lib/setupStatus.js (the admin-dashboard banner). Keep the two lists
// in sync — this file is CommonJS because it runs outside Next.

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

const STORAGE_MAX_UPLOAD_MB = 200        // lib/tiers.js
const SUPABASE_DEFAULT_UPLOAD_MB = 50    // Free-plan global default
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

const fix = process.argv.includes('--fix')
const ok = (b) => (b ? '✅' : '❌')

async function main() {
  console.log(`\nBabyJourney setup check — ${URL}\n`)
  let pending = 0

  // 0. reachability
  const { error: ping } = await sb.from('families').select('id', { head: true, count: 'exact' })
  if (ping) {
    console.log(`❌ Supabase unreachable: ${ping.message}`)
    console.log('   → Free tier pauses after ~7 days idle: Supabase dashboard → Restore project.\n')
    process.exit(1)
  }
  console.log('✅ Supabase reachable')

  // 1. schema
  const missing = []
  for (const [t, c] of REQUIRED_COLUMNS) {
    const { error } = await sb.from(t).select(c).limit(1)
    if (error) missing.push(`${t}.${c}`)
  }
  console.log(`${ok(!missing.length)} SQL migration sql/sergiu_batch2.sql ${missing.length ? `— missing: ${missing.join(', ')}` : '— applied'}`)
  if (missing.length) {
    pending++
    console.log('   → Supabase → SQL Editor → New query → paste sql/sergiu_batch2.sql → Run  (idempotent, safe to re-run)')
  }

  // 2. categories
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

  // 3. storage limit
  const { data: bucket, error: bErr } = await sb.storage.getBucket('album_uploads')
  const limitMB = bucket?.file_size_limit ? Math.round(bucket.file_size_limit / 1024 / 1024) : null
  const effective = limitMB || SUPABASE_DEFAULT_UPLOAD_MB
  const storageOk = !bErr && effective >= STORAGE_MAX_UPLOAD_MB
  console.log(`${ok(storageOk)} Storage upload limit ${bErr ? `— cannot read bucket: ${bErr.message}` : `— bucket album_uploads: ${limitMB ? limitMB + ' MB' : 'no own limit → project default ' + SUPABASE_DEFAULT_UPLOAD_MB + ' MB'} (need ≥ ${STORAGE_MAX_UPLOAD_MB} MB)`}`)
  if (!storageOk) {
    pending++
    console.log(`   → Supabase → Settings → Storage → Upload file size limit → ${STORAGE_MAX_UPLOAD_MB} MB, then run the SQL migration (it sets the bucket limit)`)
  }

  // 4-6. env (checked in THIS shell/.env.local — on Vercel set the same vars)
  const email = !!(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
  const sms = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER)
  const bypass = String(env.LOGIN_OTP_BYPASS || '').toLowerCase() === 'true'
  console.log(`${ok(email)} Email (Resend) ${email ? '— configured' : '— RESEND_API_KEY / RESEND_FROM_EMAIL missing → signup / 2FA / PIN-reset codes are NOT sent'}`)
  if (!email) { pending++; console.log('   → set RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel env (and .env.local for dev), see NOTIFICATIONS.md') }
  console.log(`${ok(sms)} SMS (Twilio) ${sms ? '— configured' : '— TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing → SMS codes are NOT sent'}`)
  if (!sms) { pending++; console.log('   → set TWILIO_* in Vercel env, see NOTIFICATIONS.md') }
  console.log(`${ok(!bypass)} Login 2FA ${bypass ? '— LOGIN_OTP_BYPASS=true (codes skipped at login)' : '— active'}`)
  if (bypass) { pending++; console.log('   → ONLY after email works: LOGIN_OTP_BYPASS=false in Vercel env → Redeploy') }

  console.log(`\n${pending === 0 ? '🎉 Everything is set up.' : `${pending} step(s) pending.`}  (env checks reflect this machine; verify the same vars exist in Vercel → Settings → Environment Variables)\n`)
  process.exit(pending === 0 ? 0 : 1)
}

main().catch((e) => { console.error('check failed:', e.message || e); process.exit(2) })
