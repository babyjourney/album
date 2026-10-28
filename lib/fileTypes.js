export const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.webm', '.ogv', '.m4v', '.mkv']
export const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.oga', '.ogg', '.opus', '.weba', '.flac']
export const DOC_EXT   = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.ppt', '.pptx', '.xls', '.xlsx']
export const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.bmp', '.svg']

const hasExt = (url, list) => {
  if (!url) return false
  const u = String(url).toLowerCase().split('?')[0]
  return list.some((ext) => u.endsWith(ext) || u.includes(ext + '?') || u.includes(ext))
}

export function detectFileTypeFromUrl(url) {
  if (hasExt(url, VIDEO_EXT)) return 'video'
  if (hasExt(url, AUDIO_EXT)) return 'audio'
  if (hasExt(url, DOC_EXT)) return 'document'
  return 'image'
}

export function detectFileTypeFromFile(file) {
  if (!file) return 'image'
  const mime = (file.type || '').toLowerCase()
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document'
  return detectFileTypeFromUrl(file.name || '')
}

export function detectPostType(urls) {
  const list = Array.isArray(urls) ? urls : [urls]
  if (list.some((u) => detectFileTypeFromUrl(u) === 'video')) return 'video'
  if (list.some((u) => detectFileTypeFromUrl(u) === 'audio')) return 'audio'
  if (list.some((u) => detectFileTypeFromUrl(u) === 'document')) return 'document'
  return 'image'
}

export const isVideoUrl = (url) => detectFileTypeFromUrl(url) === 'video'
export const isAudioUrl = (url) => detectFileTypeFromUrl(url) === 'audio'
export const isDocumentUrl = (url) => detectFileTypeFromUrl(url) === 'document'

const UPLOAD_MIME_BY_EXT = {
  '.jpg': ['image/jpeg', 'image/pjpeg', 'image/jpg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg', 'image/jpg'],
  '.png': ['image/png', 'image/x-png', 'image/apng'],
  '.gif': ['image/gif'],
  '.heic': ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'],
  '.heif': ['image/heif', 'image/heic', 'image/heif-sequence', 'image/heic-sequence'],
  '.webp': ['image/webp'],
  '.jxl': ['image/jxl'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.m4v': ['video/x-m4v', 'video/mp4'],
  '.webm': ['video/webm'],
}

export const UPLOAD_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp', '.jxl']
export const UPLOAD_VIDEO_EXT = ['.mp4', '.mov', '.m4v', '.webm']
export const UPLOAD_EXT = [...UPLOAD_IMAGE_EXT, ...UPLOAD_VIDEO_EXT]
export const JPEG_EXT_ALIASES = ['.jfif', '.jpe', '.pjpeg', '.pjp']

export const CONVERT_TO_JPEG_EXT = ['.heic', '.heif', '.jxl']
const CONVERT_TO_JPEG_MIME = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'image/jxl']

export const STORED_IMAGE_EXT = UPLOAD_IMAGE_EXT.filter((ext) => !CONVERT_TO_JPEG_EXT.includes(ext))
export const STORED_VIDEO_EXT = UPLOAD_VIDEO_EXT
export const STORED_MEDIA_EXT = [...STORED_IMAGE_EXT, ...STORED_VIDEO_EXT]

const uniq = (list) => [...new Set(list)]
const mimesFor = (exts) => uniq(exts.flatMap((ext) => UPLOAD_MIME_BY_EXT[ext] || []))

export const UPLOAD_IMAGE_MIME = mimesFor(UPLOAD_IMAGE_EXT)
export const UPLOAD_VIDEO_MIME = mimesFor(UPLOAD_VIDEO_EXT)
export const UPLOAD_IMAGE_ACCEPT = [...UPLOAD_IMAGE_EXT, ...JPEG_EXT_ALIASES, ...UPLOAD_IMAGE_MIME].join(',')

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/x-png': '.png',
  'image/apng': '.png',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heic-sequence': '.heic',
  'image/heif': '.heif',
  'image/heif-sequence': '.heif',
  'image/webp': '.webp',
  'image/jxl': '.jxl',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'video/webm': '.webm',
}

export const UPLOAD_FORMAT_LABELS = {
  images: 'JPG, PNG, GIF, HEIC/HEIF, WebP, JXL',
  videos: 'MP4, MOV, M4V, WebM',
}

export const UPLOAD_ACCEPT = [
  ...UPLOAD_EXT,
  ...JPEG_EXT_ALIASES,
  'image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp', 'image/jxl',
  'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm',
].join(',')

export function fileExtension(name) {
  const base = String(name || '').split(/[\\/]/).pop() || ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot).toLowerCase()
}

export function urlExtension(url) {
  if (!url || typeof url !== 'string') return ''
  const path = url.split('#')[0].split('?')[0]
  let last = path.split('/').pop() || ''
  try { last = decodeURIComponent(last) } catch {}
  return fileExtension(last)
}

const normalizeMime = (type) => String(type || '').toLowerCase().split(';')[0].trim()

const canonicalUploadExtension = (ext) => (JPEG_EXT_ALIASES.includes(ext) ? '.jpg' : ext)

export function classifyUploadFile(file) {
  if (!file) return null
  const mime = normalizeMime(file.type)
  const nameExt = canonicalUploadExtension(fileExtension(file.name))
  const ext = UPLOAD_EXT.includes(nameExt) ? nameExt : EXT_BY_MIME[mime] || ''
  const kind = UPLOAD_IMAGE_EXT.includes(ext) ? 'image' : UPLOAD_VIDEO_EXT.includes(ext) ? 'video' : null
  if (!kind) return null
  const mimeUnknown = !mime || mime === 'application/octet-stream'
  const allowedMimes = kind === 'image' ? UPLOAD_IMAGE_MIME : UPLOAD_VIDEO_MIME
  if (!mimeUnknown && !allowedMimes.includes(mime)) return null
  const canonicalMime = UPLOAD_MIME_BY_EXT[ext][0]
  return {
    kind,
    ext,
    mime: canonicalMime,
    needsConversion: kind === 'image' && (CONVERT_TO_JPEG_EXT.includes(ext) || CONVERT_TO_JPEG_MIME.includes(mime)),
    isGif: ext === '.gif',
  }
}

export const isAcceptedUploadFile = (file) => classifyUploadFile(file) !== null

export function storedMediaKindFromUrl(url) {
  const ext = urlExtension(url)
  if (STORED_IMAGE_EXT.includes(ext)) return 'image'
  if (STORED_VIDEO_EXT.includes(ext)) return 'video'
  return null
}

export const isAllowedStoredMediaUrl = (url) => storedMediaKindFromUrl(url) !== null
export const isAllowedStoredImageUrl = (url) => storedMediaKindFromUrl(url) === 'image'
export const isAllowedStoredVideoUrl = (url) => storedMediaKindFromUrl(url) === 'video'

export const STORAGE_BUCKET = 'album_uploads'

const storagePublicPrefix = () => {
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '')
  return base ? `${base}/storage/v1/object/public/${STORAGE_BUCKET}/` : null
}

export function storagePathFromUrl(url) {
  const prefix = storagePublicPrefix()
  if (!prefix || typeof url !== 'string' || !url.startsWith(prefix)) return null
  const raw = url.slice(prefix.length)
  if (!raw || /[?#\\]/.test(raw)) return null
  let path
  try { path = decodeURIComponent(raw) } catch { return null }
  if (/[%\\\u0000-\u001f\u007f]/.test(path)) return null
  const rawSegments = raw.split('/')
  const segments = path.split('/')
  if (segments.length < 2 || rawSegments.length !== segments.length) return null
  if (segments.some((s) => !s || s === '.' || s === '..')) return null
  return path
}

export function ownStoragePath(url, familyId) {
  if (!familyId) return null
  const folder = `${familyId}/`
  const path = storagePathFromUrl(url)
  if (!path || !path.startsWith(folder)) return null
  return url.slice(storagePublicPrefix().length).startsWith(folder) ? path : null
}

export const isOwnStorageUrl = (url, familyId) => ownStoragePath(url, familyId) !== null

const OLD_FORMAT_URLS_MARKER = '__MULTI_PHOTO_URLS__:'
const REFERENCE_PAGE_ROWS = 1000
const REFERENCE_MAX_PAGES = 200
const PHOTO_REFERENCE_COLUMNS = ['file_url, file_urls, poster_urls', 'file_url, file_urls', 'file_url']
const MISSING_SCHEMA_CODES = ['42P01', '42703', 'PGRST204', 'PGRST205']
const REFERENCED_PATH_PATTERN = new RegExp(`/storage/v1/[^?#]*?/${STORAGE_BUCKET}/([^?#]+)`)

const isMissingSchema = (error) =>
  MISSING_SCHEMA_CODES.includes(error?.code) || /does not exist|could not find/i.test(error?.message || '')

function referencedStoragePath(url) {
  if (typeof url !== 'string') return null
  const match = REFERENCED_PATH_PATTERN.exec(url)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

function urlList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function oldFormatUrls(description) {
  if (typeof description !== 'string') return []
  const at = description.indexOf(OLD_FORMAT_URLS_MARKER)
  if (at < 0) return []
  return urlList(description.slice(at + OLD_FORMAT_URLS_MARKER.length).split('\n')[0])
}

async function selectAllRows(buildQuery) {
  const rows = []
  for (let page = 0; page < REFERENCE_MAX_PAGES; page += 1) {
    const { data, error } = await buildQuery().range(rows.length, rows.length + REFERENCE_PAGE_ROWS - 1)
    if (error) return { data: rows, error }
    if (!data || data.length === 0) return { data: rows, error: null }
    rows.push(...data)
  }
  return { data: rows, error: { message: 'too many rows to check storage references' } }
}

async function selectPhotoReferences(client, familyId) {
  let result = { data: [], error: null }
  for (const columns of PHOTO_REFERENCE_COLUMNS) {
    result = await selectAllRows(() => client.from('photos').select(columns).eq('family_id', familyId).order('id'))
    if (!result.error || !isMissingSchema(result.error)) return result
  }
  return result
}

export async function filterUnreferencedStoragePaths(client, familyId, paths) {
  const candidates = [...new Set((paths || []).filter(Boolean))]
  if (!candidates.length) return { paths: [], error: null }
  if (!familyId) return { paths: [], error: { message: 'family id missing' } }
  const results = await Promise.all([
    client.from('families').select('profile_picture_url').eq('id', familyId).maybeSingle(),
    client.from('children').select('profile_picture_url').eq('family_id', familyId),
    client.from('growth_compare').select('then_url, now_url').eq('family_id', familyId),
    client.from('family_tree_nodes').select('photo_url').eq('family_id', familyId),
    selectPhotoReferences(client, familyId),
    selectAllRows(() => client.from('photos').select('description').eq('family_id', familyId)
      .like('description', `%${OLD_FORMAT_URLS_MARKER}%`).order('id')),
  ])
  const failed = results.find((result) => result.error && !isMissingSchema(result.error))
  if (failed) return { paths: [], error: failed.error }
  const rowsOf = (result) => {
    if (result.error) return []
    if (Array.isArray(result.data)) return result.data
    return result.data ? [result.data] : []
  }
  const [family, children, compare, tree, photos, legacy] = results.map(rowsOf)
  const urls = [
    ...family.map((row) => row.profile_picture_url),
    ...children.map((row) => row.profile_picture_url),
    ...compare.flatMap((row) => [row.then_url, row.now_url]),
    ...tree.map((row) => row.photo_url),
    ...photos.flatMap((row) => [row.file_url, ...urlList(row.file_urls), ...urlList(row.poster_urls)]),
    ...legacy.flatMap((row) => oldFormatUrls(row.description)),
  ]
  const referenced = new Set(urls.map(referencedStoragePath).filter(Boolean))
  return { paths: candidates.filter((path) => !referenced.has(path)), error: null }
}

export function documentMeta(url) {
  const u = String(url || '').toLowerCase().split('?')[0]
  const name = decodeURIComponent(u.split('/').pop() || 'document')
  let icon = '📄'
  if (u.endsWith('.pdf')) icon = '📕'
  else if (u.endsWith('.doc') || u.endsWith('.docx') || u.endsWith('.odt') || u.endsWith('.rtf')) icon = '📘'
  else if (u.endsWith('.xls') || u.endsWith('.xlsx')) icon = '📗'
  else if (u.endsWith('.ppt') || u.endsWith('.pptx')) icon = '📙'
  return { name, icon }
}
