// Centralized media-type detection so the uploader, the upload APIs, and every
// render component agree on what a file is. Posts use a coarse `file_type`:
//   'image' | 'video' | 'audio' | 'document' | 'text'
//
// Detection is by extension (URLs from Supabase storage keep their extension)
// with a MIME fallback for File objects during upload.

export const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.webm', '.ogv', '.m4v', '.mkv']
export const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.oga', '.ogg', '.opus', '.weba', '.flac']
export const DOC_EXT   = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.ppt', '.pptx', '.xls', '.xlsx']
export const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.bmp', '.svg']

// Note: '.ogg' is ambiguous (audio or video). We classify it as audio here;
// real video uploads from this app use .mp4/.webm/.mov.

const hasExt = (url, list) => {
  if (!url) return false
  const u = String(url).toLowerCase().split('?')[0]
  return list.some((ext) => u.endsWith(ext) || u.includes(ext + '?') || u.includes(ext))
}

// Returns 'video' | 'audio' | 'document' | 'image' for a URL.
export function detectFileTypeFromUrl(url) {
  if (hasExt(url, VIDEO_EXT)) return 'video'
  if (hasExt(url, AUDIO_EXT)) return 'audio'
  if (hasExt(url, DOC_EXT)) return 'document'
  return 'image'
}

// Returns 'video' | 'audio' | 'document' | 'image' for a browser File (uses MIME
// first, then extension).
export function detectFileTypeFromFile(file) {
  if (!file) return 'image'
  const mime = (file.type || '').toLowerCase()
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document'
  return detectFileTypeFromUrl(file.name || '')
}

// Coarse post-level type for a set of urls: video > audio > document > image.
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

// What the file <input accept=""> should allow (all tiers).
export const UPLOAD_ACCEPT = [
  'image/*', 'video/*', 'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', '.rtf', '.odt',
].join(',')

// Is this File an accepted upload (any of image/video/audio/document)?
export function isAcceptedUploadFile(file) {
  if (!file) return false
  const mime = (file.type || '').toLowerCase()
  if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) return true
  if (mime === 'application/pdf') return true
  // MIME can be empty for some doc types — fall back to extension.
  return hasExt(file.name, DOC_EXT)
}

// Friendly label + icon for a document URL (used in render cards).
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
