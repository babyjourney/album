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

export function uploadTimeFromStoragePath(row) {
  let best = null
  for (const url of fileUrlsOf(row)) {
    if (typeof url !== 'string') continue
    const m = url.match(STORAGE_STAMP_RE)
    if (!m) continue
    const ms = Number(m[1])
    if (!(ms > 1e12 && ms < 4e12)) continue
    if (best === null || ms < best) best = ms
  }
  return best === null ? null : new Date(best)
}

export function postedAt(row) {
  return (
    validDate(row.uploaded_at) ||
    uploadTimeFromStoragePath(row) ||
    validDate(row.updated_at) ||
    validDate(row.created_at) ||
    new Date(0)
  )
}

export function lastTouchedAt(row) {
  const posted = postedAt(row)
  const edited = validDate(row.updated_at)
  return edited && edited > posted ? edited : posted
}
