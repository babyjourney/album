import { authenticatedFetch } from './pinAuth'
import { buildZip, downloadBlob } from './zip'

const slug = (text, fallback = 'fara-titlu') => {
  const cleaned = String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[șşŞȘ]/g, 's')
    .replace(/[țţŢȚ]/g, 't')
    .replace(/[^a-zA-Z0-9]+/g, '-')
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

const postDate = (post) => {
  const d = new Date(post?.created_at)
  return isNaN(d.getTime()) ? new Date(0) : d
}

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

const mediaUrlsOf = (post) => {
  let urls = post.file_urls
  if (typeof urls === 'string') {
    try { urls = JSON.parse(urls) } catch { urls = null }
  }
  if (Array.isArray(urls) && urls.length) return urls.filter(Boolean)
  return post.file_url ? [post.file_url] : []
}

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
  const tr = (key, fallback, vars = {}) => {
    if (typeof t === 'function') {
      const v = t(key, vars)
      if (v && v !== key) return v
    }
    return Object.entries(vars).reduce((acc, [k, val]) => acc.replace(`{${k}}`, String(val)), fallback || '')
  }

  report('fetching')

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

  const childNamesById = new Map()
  try {
    const cRes = await fetcher(`/api/children/list?familyId=${familyId}`)
    const cJson = await cRes.json()
    for (const child of cJson?.children || []) childNamesById.set(child.id, child.name)
  } catch {
  }

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

  const entries = []
  const csv = [
    tr('exportCsvHeader', 'Data,Titlu,Descriere,Copii,Categorie,Hashtaguri,Fisiere'),
  ]

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
          console.warn('Export: skipping unreachable file', url, err)
        }
      }

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
