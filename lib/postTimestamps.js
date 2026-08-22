// "When was this post actually made?" — shared by the admin dashboard and the
// setup checks. Safe to import from server and client (no DOM, no env).
//
// `photos.created_at` is the MEMORY date: /api/posts/create-multi and
// /api/posts/update overwrite it with the date the user picked, so a 2019
// photo uploaded last week has created_at = 2019. Anything measuring ACTIVITY
// must not read it (that is what made active families show as 💀 dead with
// "last post 1449 days ago" — Sergiu 29.07 #1, 19.08).
//
// The real upload moment is resolved from the best source available, in order:
//
//   1. photos.uploaded_at  — stamped by the DB on insert, never rewritten.
//                            Only exists once sql/sergiu_batch2.sql has run.
//   2. the storage path    — every upload is stored as
//                            {familyId}/{Date.now()}-{index}-{random}.{ext}
//                            (components/UploadForm.js, FileImporter.js), so the
//                            13-digit epoch-ms stamp in the URL IS the upload
//                            time. Exact, free, and present on every media post
//                            ever created — which is why the dashboard is right
//                            even on a deployment that has not run the migration.
//   3. photos.updated_at   — DEFAULT NOW() at insert, bumped only by a real
//                            edit (posts/update.js). Covers text posts (no file).
//   4. photos.created_at   — last resort.

const STORAGE_STAMP_RE = /\/(\d{13})-\d+(?:-[a-z]+)?-[a-z0-9]+\.[A-Za-z0-9]+(?:[?#].*)?$/

export const asArray = (v) => {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export const fileUrlsOf = (row) => {
  const urls = asArray(row.file_urls)
  if (urls.length) return urls
  return row.file_url ? [row.file_url] : []
}

const validDate = (v) => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// Earliest storage stamp across the post's files = the moment the upload began.
// Returns a Date, or null for posts without a stamped file (text posts).
export function uploadTimeFromStoragePath(row) {
  let best = null
  for (const url of fileUrlsOf(row)) {
    if (typeof url !== 'string') continue
    const m = url.match(STORAGE_STAMP_RE)
    if (!m) continue
    const ms = Number(m[1])
    // Sanity window: 2001-09 .. 2096-10. Anything else is not an epoch stamp.
    if (!(ms > 1e12 && ms < 4e12)) continue
    if (best === null || ms < best) best = ms
  }
  return best === null ? null : new Date(best)
}

// The moment the post was uploaded. Always returns a Date.
export function postedAt(row) {
  return (
    validDate(row.uploaded_at) ||
    uploadTimeFromStoragePath(row) ||
    validDate(row.updated_at) ||
    validDate(row.created_at) ||
    new Date(0)
  )
}

// The moment the family last touched the post (upload OR a later edit). An
// edit is real activity too — a family re-captioning old photos is alive, not
// dead — so this is what "Ultima postare" / the activity status read.
export function lastTouchedAt(row) {
  const posted = postedAt(row)
  const edited = validDate(row.updated_at)
  return edited && edited > posted ? edited : posted
}
