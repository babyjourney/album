import { classifyUploadFile, fileExtension, JPEG_EXT_ALIASES } from './fileTypes'

const NATIVE_DECODE_TIMEOUT_MS = 20000
const MIN_JPEG_QUALITY = 0.45
const MAX_ENCODE_ATTEMPTS = 8

const baseName = (name) => String(name || 'image').replace(/\.[^./\\]+$/, '') || 'image'

function canonicalName(name, currentExt, info) {
  if (currentExt === info.ext) return name
  const stem = JPEG_EXT_ALIASES.includes(currentExt)
    ? baseName(name)
    : String(name || '').replace(/\.+$/, '') || (info.kind === 'video' ? 'video' : 'image')
  return `${stem}${info.ext}`
}

export function withCanonicalType(file, info = classifyUploadFile(file)) {
  if (!file || !info) return file
  const currentExt = fileExtension(file.name)
  if (file.type === info.mime && currentExt === info.ext) return file
  const name = canonicalName(file.name, currentExt, info)
  return new File([file], name, { type: info.mime, lastModified: file.lastModified })
}

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('decode-timeout')), ms) }),
  ]).finally(() => clearTimeout(timer))
}

async function decodeWithImageBitmap(blob) {
  if (typeof createImageBitmap !== 'function') return null
  try {
    const bitmap = await withTimeout(createImageBitmap(blob, { imageOrientation: 'from-image' }), NATIVE_DECODE_TIMEOUT_MS)
    if (!bitmap || !bitmap.width || !bitmap.height) {
      bitmap?.close?.()
      return null
    }
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() }
  } catch {
    return null
  }
}

async function decodeWithImageElement(blob) {
  if (typeof Image === 'undefined') return null
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await withTimeout(new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('decode-failed'))
      img.src = url
    }), NATIVE_DECODE_TIMEOUT_MS)
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('decode-failed')
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => { img.removeAttribute('src'); URL.revokeObjectURL(url) },
    }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

async function decodeNative(blob) {
  return (await decodeWithImageBitmap(blob)) || (await decodeWithImageElement(blob))
}

function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return {
    source: canvas,
    width: canvas.width,
    height: canvas.height,
    release: () => { canvas.width = 1; canvas.height = 1 },
  }
}

async function decodeHeifWasm(buffer) {
  const mod = await import('libheif-js/wasm-bundle')
  const libheif = mod.default || mod
  const decoder = new libheif.HeifDecoder()
  let images = []
  try {
    images = decoder.decode(buffer) || []
    if (!images.length) throw new Error('heif-empty')
    const image = images[0]
    const width = image.get_width()
    const height = image.get_height()
    const imageData = new ImageData(width, height)
    for (let i = 3; i < imageData.data.length; i += 4) imageData.data[i] = 255
    await new Promise((resolve, reject) => {
      image.display(imageData, (out) => (out ? resolve() : reject(new Error('heif-display-failed'))))
    })
    return imageDataToCanvas(imageData)
  } finally {
    for (const image of images) { try { image.free() } catch {} }
    if (decoder.decoder) { try { libheif.heif_context_free(decoder.decoder) } catch {} }
  }
}

async function decodeJxlWasm(buffer) {
  const mod = await import('@jsquash/jxl/decode.js')
  const decode = mod.default
  const imageData = await decode(buffer)
  if (!imageData || !imageData.width || !imageData.height) throw new Error('jxl-empty')
  return imageDataToCanvas(imageData)
}

const JXL_CONTAINER_SIGNATURE = [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a]

function sniffFormat(bytes, fallbackExt) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0x0a) return 'jxl'
  if (bytes.length >= 12 && JXL_CONTAINER_SIGNATURE.every((b, i) => bytes[i] === b)) return 'jxl'
  if (bytes.length >= 12 && String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === 'ftyp') return 'heif'
  return fallbackExt === '.jxl' ? 'jxl' : 'heif'
}

async function decodeWasm(file, fallbackExt) {
  const buffer = await file.arrayBuffer()
  const format = sniffFormat(new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength)), fallbackExt)
  if (format === 'jxl') return decodeJxlWasm(buffer)
  return decodeHeifWasm(buffer)
}

function fitSize(width, height, maxEdge) {
  const longest = Math.max(width, height)
  const scale = maxEdge && longest > maxEdge ? maxEdge / longest : 1
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToJpeg(decoded, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(decoded.source, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 1
      canvas.height = 1
      if (blob && blob.size) resolve(blob)
      else reject(new Error('encode-failed'))
    }, 'image/jpeg', quality)
  })
}

async function encodeWithinLimits(decoded, { maxWidthOrHeight, initialQuality, maxSizeMB }) {
  const maxBytes = Number.isFinite(maxSizeMB) && maxSizeMB > 0 ? maxSizeMB * 1024 * 1024 : Infinity
  let { width, height } = fitSize(decoded.width, decoded.height, maxWidthOrHeight)
  let quality = Number.isFinite(initialQuality) ? Math.min(1, Math.max(MIN_JPEG_QUALITY, initialQuality)) : 0.85
  let blob = await canvasToJpeg(decoded, width, height, quality)
  for (let attempt = 1; attempt < MAX_ENCODE_ATTEMPTS && blob.size > maxBytes; attempt += 1) {
    if (quality > MIN_JPEG_QUALITY + 0.001) {
      quality = Math.max(MIN_JPEG_QUALITY, quality * 0.85)
    } else {
      width = Math.max(1, Math.round(width * 0.8))
      height = Math.max(1, Math.round(height * 0.8))
    }
    blob = await canvasToJpeg(decoded, width, height, quality)
  }
  return blob
}

export async function canDecodeImage(file) {
  const decoded = await decodeNative(file)
  if (!decoded) return false
  decoded.release()
  return true
}

export async function convertImageToJpeg(file, options = {}) {
  if (typeof document === 'undefined') throw new Error('convert-unavailable')
  const info = classifyUploadFile(file)
  if (!info || info.kind !== 'image') throw new Error('convert-unsupported')
  const sourceType = String(file.type || '').startsWith('image/') ? file.type : info.mime
  const source = file.type === sourceType ? file : new Blob([file], { type: sourceType })
  let decoded = await decodeNative(source)
  if (!decoded) {
    try {
      decoded = await decodeWasm(source, sourceType === 'image/jxl' ? '.jxl' : info.ext)
    } catch (err) {
      console.warn('[imageConvert] decoder failed for', file?.name, err)
      decoded = null
    }
  }
  if (!decoded) throw new Error('convert-decode-failed')
  try {
    const blob = await encodeWithinLimits(decoded, options)
    return new File([blob], `${baseName(file.name)}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    decoded.release()
  }
}
