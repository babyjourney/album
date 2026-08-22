// Structured album export (item 8).
//
// The old export handed the user a .json full of URLs. Sergiu's point was blunt
// and correct: "eu nu stiu ce sa fac cu acest fisier, si mai putin vor cunoaste
// clientii nostri." Nobody wants a JSON file — they want their photos.
//
// So an export is now a .zip that mirrors how you'd organize the album by hand:
//
//   2020/
//     2020.09.15Mark_bday_01.jpeg
//     2020.09.15Mark_bday_02.jpeg
//     2020.11.02Mark-Ana_prima-zapada_01.mp4
//     2020.12.24Mark_scrisoare-catre-mos.txt      <- text posts
//   2021/
//     ...
//   postari.csv                                   <- opens in Excel
//   CITESTE-MA.txt
//
// Filename format, per the spec:
//   [an.luna.zi][numecopil1-2]_[titlu]_[nr].[ext]

import { authenticatedFetch } from './pinAuth'
import { buildZip, downloadBlob } from './zip'

// Strip anything that would be illegal or ugly in a filename, on any OS.
//
// Diacritics are folded to ASCII rather than dropped (ș -> s), so "Grădiniță"
// becomes "Gradinita" and not "Grdini".
//
// CASE IS PRESERVED. The spec's example is `2020.09.15Mark_bday_01.jpeg` — a
// capital M. Lower-casing turned that into `mark`, which doesn't match what was
// asked for and reads worse.
const slug = (text, fallback = 'fara-titlu') => {
  const cleaned = String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining accents
    .replace(/[șşŞȘ]/g, 's')
    .replace(/[țţŢȚ]/g, 't')
    .replace(/[^a-zA-Z0-9]+/g, '-')    // anything else -> hyphen
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return cleaned || fallback
}

const extensionOf = (url, fallback = 'bin') => {
  try {
    const path = new URL(url).pathname
    const match = path.match(/\.([a-zA-Z0-9]{1,5})$/)
    return match ? match[1].toLowerCase() : fallback
  } catch {
    const match = String(url).match(/\.([a-zA-Z0-9]{1,5})(?:\?|$)/)
    return match ? match[1].toLowerCase() : fallback
  }
}

const pad2 = (n) => String(n).padStart(2, '0')

// A post with a missing or unparseable created_at would otherwise produce a
// literal "NaN/" folder full of "NaN.NaN.NaN_…" filenames. Fall back to the
// epoch so the file still lands somewhere sane and nothing is lost.
const postDate = (post) => {
  const d = new Date(post?.created_at)
  return isNaN(d.getTime()) ? new Date(0) : d
}

// hashtags is TEXT[] in Postgres, but other call sites in this codebase all
// guard with Array.isArray — so it evidently isn't always one. An uncaught
// TypeError here would kill the export AFTER every file had been downloaded.
const hashtagsOf = (post) => {
  if (Array.isArray(post?.hashtags)) return post.hashtags
  if (typeof post?.hashtags === 'string') {
    try {
      const parsed = JSON.parse(post.hashtags)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return post.hashtags.split(/[\s,]+/).filter(Boolean)
    }
  }
  return []
}

// The media URLs of a post, in display order.
const mediaUrlsOf = (post) => {
  let urls = post.file_urls
  if (typeof urls === 'string') {
    try { urls = JSON.parse(urls) } catch { urls = null }
  }
  if (Array.isArray(urls) && urls.length) return urls.filter(Boolean)
  return post.file_url ? [post.file_url] : []
}

// "2020.09.15Mark-Ana_bday" — everything up to the _NN.ext suffix.
const baseNameFor = (post, childNamesById) => {
  const d = postDate(post)
  const date = `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`

  const kids = (post.__children || [])
    .map((id) => childNamesById.get(id))
    .filter(Boolean)
    .map((name) => slug(name, ''))
    .filter(Boolean)
    .join('-')

  const title = slug(post.title || post.description, 'fara-titlu')
  return `${date}${kids}_${title}`
}

const csvCell = (value) => {
  const s = String(value ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Fetch everything needed and download a .zip.
 *
 * @param {object}   opts
 * @param {string}   opts.familyId
 * @param {string}   opts.familyName
 * @param {number|'all'} [opts.year]     A single year, or 'all'.
 * @param {(stage: string, done: number, total: number) => void} [opts.onProgress]
 * @param {Function} [opts.fetcher]      Defaults to the family session fetch.
 *                                       The admin dashboard passes adminFetch,
 *                                       which carries the admin token instead.
 * @param {Function} [opts.t]            Translator (from useLanguage) for the
 *                                       README/CSV/errors. Romanian without it.
 * @param {string}   [opts.locale]       BCP-47 locale for the export timestamp.
 */
export async function exportFamilyArchive({
  familyId,
  familyName,
  year = 'all',
  onProgress,
  fetcher = authenticatedFetch,
  t,
  locale = 'ro-RO',
}) {
  const report = (stage, done = 0, total = 0) => onProgress?.(stage, done, total)
  // Translate through t() when given, else the Romanian default. t() returns
  // the key itself for an unknown key, which we treat as "no translation".
  const tr = (key, fallback, vars = {}) => {
    if (typeof t === 'function') {
      const v = t(key, vars)
      if (v && v !== key) return v
    }
    return Object.entries(vars).reduce((acc, [k, val]) => acc.replace(`{${k}}`, String(val)), fallback || '')
  }

  report('fetching')

  // 1. Posts (oldest first, so the archive reads chronologically).
  const res = await fetcher(`/api/photos/list?familyId=${familyId}&sort=oldest`)
  const data = await res.json()
  if (!res.ok) throw new Error((data?.errorKey && tr(data.errorKey, '')) || data?.error || tr('exportErrLoadPosts', 'Nu am putut încărca postările'))

  let posts = data.photos || []
  if (year !== 'all') {
    posts = posts.filter((p) => postDate(p).getFullYear() === Number(year))
  }
  if (posts.length === 0) {
    throw new Error(year === 'all' ? tr('exportErrNoPosts', 'Nu există postări de exportat.') : tr('exportErrNoPostsYear', 'Nu există postări în {year}.', { year }))
  }

  // 2. Children, so filenames can carry the names of who's in the post.
  const childNamesById = new Map()
  try {
    const cRes = await fetcher(`/api/children/list?familyId=${familyId}`)
    const cJson = await cRes.json()
    for (const child of cJson?.children || []) childNamesById.set(child.id, child.name)
  } catch {
    // Names are a nicety — an export without them is still a good export.
  }

  // Which children each post is tagged with.
  try {
    const linkRes = await fetcher(`/api/child-posts/list?familyId=${familyId}`)
    const linkJson = await linkRes.json()
    const byPost = new Map()
    for (const link of linkJson?.links || linkJson?.childPosts || []) {
      const list = byPost.get(link.photo_id) || []
      list.push(link.child_id)
      byPost.set(link.photo_id, list)
    }
    for (const post of posts) post.__children = byPost.get(post.id) || []
  } catch {
    for (const post of posts) post.__children = []
  }

  // 3. Build the entry list, downloading each media file.
  const entries = []
  const csv = [
    tr('exportCsvHeader', 'Data,Titlu,Descriere,Copii,Categorie,Hashtaguri,Fisiere'),
  ]

  // Guard against two posts on the same day with the same title colliding.
  const usedNames = new Set()
  const uniquePath = (path) => {
    if (!usedNames.has(path)) { usedNames.add(path); return path }
    const dot = path.lastIndexOf('.')
    const stem = dot > 0 ? path.slice(0, dot) : path
    const ext = dot > 0 ? path.slice(dot) : ''
    let n = 2
    let candidate = `${stem}-${n}${ext}`
    while (usedNames.has(candidate)) { n += 1; candidate = `${stem}-${n}${ext}` }
    usedNames.add(candidate)
    return candidate
  }

  let done = 0
  for (const post of posts) {
    const folder = String(postDate(post).getFullYear())
    const base = baseNameFor(post, childNamesById)
    const urls = mediaUrlsOf(post)
    const fileNames = []

    if (urls.length === 0) {
      // Text post — becomes a .txt carrying its title and body.
      const body = [post.title || '', '', post.description || ''].join('\n').trim()
      const path = uniquePath(`${folder}/${base}.txt`)
      entries.push({
        path,
        blob: new Blob([body], { type: 'text/plain;charset=utf-8' }),
        date: postDate(post),
      })
      fileNames.push(path)
    } else {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        try {
          const fileRes = await fetch(url)
          if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`)
          const blob = await fileRes.blob()
          const ext = extensionOf(url, 'jpg')
          const path = uniquePath(`${folder}/${base}_${pad2(i + 1)}.${ext}`)
          entries.push({ path, blob, date: postDate(post) })
          fileNames.push(path)
        } catch (err) {
          // One unreachable file must not sink a 500-photo export.
          console.warn('Export: skipping unreachable file', url, err)
        }
      }

      // Keep the caption — it's the story, and it isn't in the pixels.
      if ((post.description || '').trim()) {
        const path = uniquePath(`${folder}/${base}.txt`)
        entries.push({
          path,
          blob: new Blob([post.description], { type: 'text/plain;charset=utf-8' }),
          date: postDate(post),
        })
      }
    }

    const d = postDate(post)
    csv.push([
      csvCell(`${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`),
      csvCell(post.title),
      csvCell(post.description),
      csvCell((post.__children || []).map((id) => childNamesById.get(id)).filter(Boolean).join(' ')),
      csvCell(post.category),
      csvCell(hashtagsOf(post).map((h) => `#${h}`).join(' ')),
      csvCell(fileNames.join(' ')),
    ].join(','))

    done += 1
    report('downloading', done, posts.length)
  }

  if (entries.length === 0) {
    throw new Error(tr('exportErrNoFiles', 'Nu s-a putut descărca niciun fișier.'))
  }

  // A spreadsheet instead of a JSON blob — anyone can open this.
  // The BOM is what makes Excel read UTF-8 (and thus diacritics) correctly.
  const csvName = tr('exportCsvName', 'postari.csv')
  entries.push({
    path: csvName,
    blob: new Blob(['﻿' + csv.join('\n')], { type: 'text/csv;charset=utf-8' }),
  })

  const scope = year === 'all' ? tr('exportScopeAll', 'toate') : String(year)
  entries.push({
    path: tr('exportReadmeName', 'CITESTE-MA.txt'),
    blob: new Blob([[
      `${tr('exportReadmeAlbum', 'Album')}: ${familyName || ''}`,
      `${tr('exportReadmeExported', 'Exportat')}: ${new Date().toLocaleString(locale)}`,
      `${tr('exportReadmeContent', 'Conținut')}: ${year === 'all' ? tr('exportReadmeAllPosts', 'toate postările') : tr('exportReadmeYear', 'anul {year}', { year })}`,
      '',
      tr('exportReadmeStructureTitle', 'STRUCTURĂ'),
      `  ${tr('exportReadmeStructure', 'Fiecare an are folderul lui. În el se află toate fișierele din acel an.')}`,
      '',
      tr('exportReadmeNamingTitle', 'DENUMIREA FIȘIERELOR'),
      `  ${tr('exportReadmeNaming', 'an.luna.zi + numele copiilor _ titlul postării _ numărul fișierului . extensie')}`,
      `  ${tr('exportReadmeExample', 'exemplu:  2020.09.15Mark_bday_01.jpeg')}`,
      '',
      `  ${tr('exportReadmeCsv', '{csv}  — toate postările într-un tabel (se deschide în Excel).', { csv: csvName })}`,
      `  ${tr('exportReadmeTxt', '*.txt        — postările text și descrierile lungi.')}`,
    ].join('\n')], { type: 'text/plain;charset=utf-8' }),
  })

  report('zipping', 0, entries.length)
  const blob = await buildZip(entries, (i, total) => report('zipping', i, total))

  const stamp = new Date().toISOString().slice(0, 10)
  const name = `${slug(familyName, 'album')}-${scope}-${stamp}.zip`
  downloadBlob(blob, name)

  report('done', entries.length, entries.length)
  return { files: entries.length, posts: posts.length }
}

// Years that actually contain posts — drives the year picker.
export async function fetchExportYears(familyId, fetcher = authenticatedFetch) {
  const res = await fetcher(`/api/photos/list?familyId=${familyId}&sort=oldest`)
  const data = await res.json()
  if (!res.ok) return []
  const years = new Set()
  for (const post of data.photos || []) {
    const y = postDate(post).getFullYear()
    if (!Number.isNaN(y)) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}
