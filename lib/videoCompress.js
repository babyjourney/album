const FPS = 30
const MAX_RECORDING_OVERRUN_SECONDS = 1

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
    }
  }
  return null
}

export function canTranscodeVideo() {
  if (typeof window === 'undefined') return false
  if (typeof MediaRecorder === 'undefined') return false
  if (typeof HTMLCanvasElement === 'undefined') return false
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return false

  if (!hasAudioCapture()) return false

  return pickMimeType() !== null
}

function hasAudioCapture() {
  const media = typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null
  if (media && (typeof media.captureStream === 'function' || typeof media.mozCaptureStream === 'function')) {
    return true
  }
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
}

async function acquireAudio(video) {
  try {
    if (typeof video.captureStream === 'function') {
      return { tracks: video.captureStream().getAudioTracks(), audioCtx: null, needsUnmuted: false }
    }
    if (typeof video.mozCaptureStream === 'function') {
      return { tracks: video.mozCaptureStream().getAudioTracks(), audioCtx: null, needsUnmuted: false }
    }
  } catch (err) {
    console.warn('[videoCompress] element captureStream failed, trying WebAudio:', err)
  }

  const AudioCtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AudioCtor) return null

  try {
    const audioCtx = new AudioCtor()
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume() } catch {  }
    }
    const source = audioCtx.createMediaElementSource(video)
    const destination = audioCtx.createMediaStreamDestination()
    source.connect(destination)
    return { tracks: destination.stream.getAudioTracks(), audioCtx, needsUnmuted: true }
  } catch (err) {
    console.warn('[videoCompress] WebAudio audio capture failed:', err)
    return null
  }
}

const extensionFor = (mimeType) => (mimeType.startsWith('video/mp4') ? 'mp4' : 'webm')

function waitForEvent(target, event, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onEvent)
      target.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const onEvent = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error(`Video ${event} failed`)) }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)
    target.addEventListener(event, onEvent, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

async function loadVideoElement(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  try {
    await waitForEvent(video, 'loadeddata')
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
  return { video, url }
}

function fitDimensions(width, height, maxEdge) {
  const longest = Math.max(width, height)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  const even = (n) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

async function drawFrameAt(video, canvas, timeSec) {
  const ctx = canvas.getContext('2d')
  const target = Math.min(Math.max(timeSec, 0), Math.max(0, (video.duration || 0) - 0.05))

  if (Math.abs(video.currentTime - target) > 0.01) {
    video.currentTime = target
    await waitForEvent(video, 'seeked', { timeoutMs: 10000 })
  }

  await new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => resolve())
      setTimeout(resolve, 400)
    } else {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    }
  })

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
}

function isBlankFrame(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  if (!width || !height) return true
  let sampled = 0
  let lit = 0
  const step = Math.max(1, Math.floor(Math.min(width, height) / 16))
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      sampled += 1
      if (r + g + b > 24) lit += 1
    }
  }
  return sampled === 0 || lit / sampled < 0.02
}

const BOX_HEADER_BYTES = 16
const MAX_BOXES_SCANNED = 4096
const MAX_MOOV_BYTES = 2 * 1024 * 1024
const MAX_MOOF_BYTES = 1024 * 1024
const MAX_MFRA_BYTES = 1024 * 1024
const MAX_READ_AHEAD = 1024 * 1024
const TAIL_WINDOWS = [64 * 1024, 256 * 1024, 1024 * 1024]
const MAX_TAIL_CANDIDATES = 64
const MAX_TAIL_STEPS = 200000
const TRAILING_BOX_TYPES = ['mfra', 'free', 'skip', 'udta', 'meta', 'uuid']
const RECORDER_DRIFT_SECONDS = MAX_RECORDING_OVERRUN_SECONDS + 1

const EBML_ID = 0x1a45dfa3
const SEGMENT_ID = 0x18538067
const SEEK_HEAD_ID = 0x114d9b74
const INFO_ID = 0x1549a966
const TRACKS_ID = 0x1654ae6b
const CLUSTER_ID = 0x1f43b675
const CUES_ID = 0x1c53bb6b
const TAGS_ID = 0x1254c367
const CHAPTERS_ID = 0x1043a770
const ATTACHMENTS_ID = 0x1941a469
const TIMESTAMP_SCALE_ID = 0x2ad7b1
const DURATION_ID = 0x4489
const CLUSTER_TIMESTAMP_ID = 0xe7
const SIMPLE_BLOCK_ID = 0xa3
const BLOCK_GROUP_ID = 0xa0
const BLOCK_ID = 0xa1
const BLOCK_DURATION_ID = 0x9b
const VOID_ID = 0xec
const CRC32_ID = 0xbf
const CLUSTER_SKIPPED_IDS = [0xa7, 0xab, 0xaf, 0x5854, VOID_ID, CRC32_ID]
const SEGMENT_LEVEL_IDS = [SEEK_HEAD_ID, INFO_ID, TRACKS_ID, CLUSTER_ID, CUES_ID, TAGS_ID, CHAPTERS_ID, ATTACHMENTS_ID]
const TRAILING_ELEMENT_IDS = [SEEK_HEAD_ID, INFO_ID, TRACKS_ID, CUES_ID, TAGS_ID, CHAPTERS_ID, ATTACHMENTS_ID, VOID_ID, CRC32_ID]

const isPositiveSeconds = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0

const unknownDuration = (reason, streamed = false) => ({ seconds: null, exact: false, streamed, reason })

const u32 = (bytes, at) => bytes[at] * 0x1000000 + ((bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3])
const u64 = (bytes, at) => u32(bytes, at) * 0x100000000 + u32(bytes, at + 4)
const fourcc = (bytes, at) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3])
const isBoxType = (type) => /^[\x20-\x7e]{4}$/.test(type)

function parseBox(bytes, at, limit) {
  if (at < 0 || at + 8 > bytes.length) return null
  const type = fourcc(bytes, at + 4)
  if (!isBoxType(type)) return null
  let size = u32(bytes, at)
  let headerSize = 8
  if (size === 1) {
    if (at + 16 > bytes.length) return null
    size = u64(bytes, at + 8)
    headerSize = 16
  } else if (size === 0) {
    size = limit - at
  }
  if (!Number.isSafeInteger(size) || size < headerSize) return null
  return { type, start: at, size, headerSize, body: at + headerSize, end: at + size }
}

function childBoxes(bytes, from, to) {
  const limit = Math.min(to, bytes.length)
  const boxes = []
  let at = from
  while (boxes.length < MAX_BOXES_SCANNED && at + 8 <= limit) {
    const box = parseBox(bytes, at, limit)
    if (!box || box.end > limit) break
    boxes.push(box)
    at = box.end
  }
  return boxes
}

function fullBoxValue(bytes, box, offsetV0, offsetV1) {
  const version = bytes[box.body]
  if (version === 1) {
    const at = box.body + offsetV1
    if (at + 8 > Math.min(box.end, bytes.length)) return null
    if (u32(bytes, at) === 0xffffffff && u32(bytes, at + 4) === 0xffffffff) return 0
    return u64(bytes, at)
  }
  if (version === 0) {
    const at = box.body + offsetV0
    if (at + 4 > Math.min(box.end, bytes.length)) return null
    const value = u32(bytes, at)
    return value === 0xffffffff ? 0 : value
  }
  return null
}

function timescaleAndDuration(bytes, box) {
  const version = bytes[box.body]
  const timescaleAt = box.body + (version === 1 ? 20 : 12)
  if (version > 1 || timescaleAt + 4 > Math.min(box.end, bytes.length)) return null
  const duration = fullBoxValue(bytes, box, 16, 24)
  return duration === null ? null : { timescale: u32(bytes, timescaleAt), duration }
}

function parseTrak(bytes, trak) {
  let id = null
  let timescale = 0
  for (const box of childBoxes(bytes, trak.body, trak.end)) {
    if (box.type === 'tkhd') {
      const at = box.body + (bytes[box.body] === 1 ? 20 : 12)
      if (at + 4 <= Math.min(box.end, bytes.length)) id = u32(bytes, at)
    } else if (box.type === 'mdia') {
      const mdhd = childBoxes(bytes, box.body, box.end).find((child) => child.type === 'mdhd')
      const header = mdhd ? timescaleAndDuration(bytes, mdhd) : null
      if (header) timescale = header.timescale
    }
  }
  return id !== null && timescale > 0 ? { id, timescale } : null
}

function parseMoov(bytes) {
  const moov = parseBox(bytes, 0, bytes.length)
  if (!moov || moov.type !== 'moov') return null
  const movie = { timescale: 0, duration: 0, fragmentDuration: 0, fragmented: false, tracks: new Map() }
  const mergeTrack = (id, fields) => movie.tracks.set(id, { ...movie.tracks.get(id), ...fields })
  for (const box of childBoxes(bytes, moov.body, moov.end)) {
    if (box.type === 'mvhd') {
      const header = timescaleAndDuration(bytes, box)
      if (header) {
        movie.timescale = header.timescale
        movie.duration = header.duration
      }
    } else if (box.type === 'trak') {
      const track = parseTrak(bytes, box)
      if (track) mergeTrack(track.id, { timescale: track.timescale })
    } else if (box.type === 'mvex') {
      movie.fragmented = true
      for (const child of childBoxes(bytes, box.body, box.end)) {
        if (child.type === 'mehd') {
          movie.fragmentDuration = Math.max(movie.fragmentDuration, fullBoxValue(bytes, child, 4, 4) || 0)
        } else if (child.type === 'trex' && child.body + 16 <= Math.min(child.end, bytes.length)) {
          mergeTrack(u32(bytes, child.body + 4), { defaultDuration: u32(bytes, child.body + 12) })
        }
      }
    }
  }
  return movie.timescale > 0 ? movie : null
}

function trunTicks(bytes, trun, defaultDuration) {
  const end = Math.min(trun.end, bytes.length)
  if (trun.body + 8 > end) return null
  const flags = u32(bytes, trun.body) & 0xffffff
  const count = u32(bytes, trun.body + 4)
  let at = trun.body + 8
  if (flags & 0x01) at += 4
  if (flags & 0x04) at += 4
  const entryBytes = 4 * [0x100, 0x200, 0x400, 0x800].filter((flag) => flags & flag).length
  if (at + count * entryBytes > end) return null
  if (count === 0) return 0
  if (!(flags & 0x100)) return defaultDuration > 0 ? count * defaultDuration : null
  let total = 0
  for (let i = 0; i < count; i += 1) total += u32(bytes, at + i * entryBytes)
  return total
}

function parseMoof(bytes, movie) {
  const moof = parseBox(bytes, 0, bytes.length)
  if (!moof || moof.type !== 'moof') return []
  const fragments = []
  for (const traf of childBoxes(bytes, moof.body, moof.end)) {
    if (traf.type !== 'traf') continue
    const children = childBoxes(bytes, traf.body, traf.end)
    const tfhd = children.find((box) => box.type === 'tfhd')
    if (!tfhd || tfhd.body + 8 > Math.min(tfhd.end, bytes.length)) continue
    const flags = u32(bytes, tfhd.body) & 0xffffff
    const track = movie.tracks.get(u32(bytes, tfhd.body + 4))
    if (!track?.timescale) continue
    let at = tfhd.body + 8
    if (flags & 0x01) at += 8
    if (flags & 0x02) at += 4
    let defaultDuration = track.defaultDuration || 0
    if (flags & 0x08) {
      if (at + 4 > Math.min(tfhd.end, bytes.length)) continue
      defaultDuration = u32(bytes, at)
    }
    const tfdt = children.find((box) => box.type === 'tfdt')
    const base = tfdt ? fullBoxValue(bytes, tfdt, 4, 4) : null
    let ticks = 0
    let complete = base !== null
    for (const trun of children.filter((box) => box.type === 'trun')) {
      const value = trunTicks(bytes, trun, defaultDuration)
      if (value === null) complete = false
      else ticks += value
    }
    fragments.push({ trackId: u32(bytes, tfhd.body + 4), timescale: track.timescale, base, ticks, complete })
  }
  return fragments
}

async function readBoxAt(src, offset, limit, readAhead = 0) {
  if (offset < 0 || offset + 8 > limit) return null
  const bytes = await src.read(offset, Math.min(limit, offset + BOX_HEADER_BYTES), readAhead)
  const box = parseBox(bytes, 0, limit - offset)
  return box && { ...box, start: offset, body: offset + box.headerSize, end: offset + box.size }
}

async function readMoofAt(src, offset, limit) {
  const header = await readBoxAt(src, offset, limit)
  if (!header || header.type !== 'moof' || header.size > MAX_MOOF_BYTES || header.end > limit) return null
  return src.read(offset, header.end)
}

async function locateMoov(src) {
  let offset = 0
  for (let i = 0; i < MAX_BOXES_SCANNED && offset + 8 <= src.size; i += 1) {
    const readAhead = Math.min(MAX_READ_AHEAD, 64 * 1024 * 2 ** Math.min(i, 4))
    const box = await readBoxAt(src, offset, src.size, readAhead)
    if (!box) return { reason: 'iso-bad-box' }
    if (box.type === 'moov') return { moov: box }
    offset = box.end
  }
  return { reason: 'iso-no-moov' }
}

async function chainReachesEnd(src, offset, end) {
  let at = offset
  for (let i = 0; i < 8 && at < end; i += 1) {
    const box = await readBoxAt(src, at, end)
    if (!box || box.end > end) return false
    const expected = i === 0 ? box.type === 'moof' : i === 1 ? box.type === 'mdat' : TRAILING_BOX_TYPES.includes(box.type)
    if (!expected) return false
    at = box.end
  }
  return at === end
}

async function findFirstMoof(src, moov) {
  let offset = moov.end
  for (let i = 0; i < 8 && offset + 8 <= src.size; i += 1) {
    const box = await readBoxAt(src, offset, src.size)
    if (!box || box.type === 'mdat') return null
    if (box.type === 'moof') {
      const bytes = await readMoofAt(src, offset, src.size)
      return bytes ? { offset, bytes } : null
    }
    offset = box.end
  }
  return null
}

async function walkFragments(src, offset, end) {
  let at = offset
  let lastMoof = null
  for (let i = 0; i < MAX_BOXES_SCANNED && at + 8 <= end && src.spare() > 2; i += 1) {
    const box = await readBoxAt(src, at, end)
    if (!box || box.end > end) break
    if (box.type === 'moof') lastMoof = at
    else if (box.type !== 'mdat' && !TRAILING_BOX_TYPES.includes(box.type)) break
    at = box.end
  }
  return { offset: lastMoof, complete: at === end }
}

async function readRandomAccess(src) {
  if (src.size < 16) return null
  const trailer = await src.read(src.size - 16, src.size)
  if (u32(trailer, 0) !== 16 || fourcc(trailer, 4) !== 'mfro') return null
  const mfraSize = u32(trailer, 12)
  const start = src.size - mfraSize
  if (mfraSize < 16 || mfraSize > MAX_MFRA_BYTES || start < 0) return null
  const bytes = await src.read(start, src.size)
  const mfra = parseBox(bytes, 0, bytes.length)
  if (!mfra || mfra.type !== 'mfra' || mfra.end !== bytes.length) return null
  const entries = []
  for (const tfra of childBoxes(bytes, mfra.body, mfra.end)) {
    if (tfra.type !== 'tfra' || tfra.body + 16 > tfra.end) continue
    const version = bytes[tfra.body]
    const trackId = u32(bytes, tfra.body + 4)
    const lengths = u32(bytes, tfra.body + 8)
    const count = u32(bytes, tfra.body + 12)
    const valueBytes = version === 1 ? 8 : 4
    const entryBytes = valueBytes * 2 + ((lengths >> 4) & 3) + ((lengths >> 2) & 3) + (lengths & 3) + 3
    if (tfra.body + 16 + count * entryBytes > tfra.end) continue
    for (let i = 0; i < count; i += 1) {
      const at = tfra.body + 16 + i * entryBytes
      entries.push({
        trackId,
        time: version === 1 ? u64(bytes, at) : u32(bytes, at),
        moofOffset: version === 1 ? u64(bytes, at + 8) : u32(bytes, at + 4),
      })
    }
  }
  return { start, entries }
}

async function scanTail(src, minStart, find) {
  const budget = { candidates: MAX_TAIL_CANDIDATES, steps: MAX_TAIL_STEPS }
  let scannedFrom = src.size
  for (const windowBytes of TAIL_WINDOWS) {
    const from = Math.max(minStart, src.size - windowBytes)
    if (from >= scannedFrom || budget.candidates <= 0 || budget.steps <= 0) break
    const tail = await src.read(from, src.size)
    if (tail.length !== src.size - from) return null
    const found = await find(tail, from, scannedFrom - from, budget)
    if (found !== null && found !== undefined) return found
    scannedFrom = from
  }
  return null
}

async function findLastMoof(src, minStart, end) {
  return scanTail(src, minStart, async (tail, from, limit, budget) => {
    for (let i = Math.min(tail.length - 16, limit - 1); i >= 0 && budget.candidates > 0; i -= 1) {
      if (tail[i + 4] !== 0x6d || fourcc(tail, i + 4) !== 'moof' || u32(tail, i + 8) !== 16 || fourcc(tail, i + 12) !== 'mfhd') continue
      budget.candidates -= 1
      if (await chainReachesEnd(src, from + i, end)) return readMoofAt(src, from + i, end)
    }
    return null
  })
}

async function findLastFragment(src, moov, first, randomAccess) {
  const fragmentsEnd = randomAccess ? randomAccess.start : src.size
  if (randomAccess) {
    const lastOffset = randomAccess.entries.reduce((max, entry) => Math.max(max, entry.moofOffset), -1)
    if (lastOffset >= moov.end && await chainReachesEnd(src, lastOffset, fragmentsEnd)) {
      const bytes = await readMoofAt(src, lastOffset, fragmentsEnd)
      if (bytes) return { bytes, final: true }
    }
  }
  const tailBytes = await findLastMoof(src, moov.end, fragmentsEnd)
  if (tailBytes) return { bytes: tailBytes, final: true }
  if (!first) return null
  const walk = await walkFragments(src, first.offset, fragmentsEnd)
  const walkedBytes = walk.offset === null ? null : await readMoofAt(src, walk.offset, fragmentsEnd)
  return walkedBytes ? { bytes: walkedBytes, final: walk.complete } : null
}

async function fragmentTimeline(src, moov, movie) {
  const first = await findFirstMoof(src, moov)
  const starts = new Map()
  for (const fragment of first ? parseMoof(first.bytes, movie) : []) {
    if (fragment.base !== null) starts.set(fragment.trackId, Math.min(starts.get(fragment.trackId) ?? Infinity, fragment.base))
  }

  const randomAccess = await readRandomAccess(src)
  let lowerBound = 0
  for (const entry of randomAccess ? randomAccess.entries : []) {
    const track = movie.tracks.get(entry.trackId)
    if (track?.timescale && starts.has(entry.trackId)) {
      lowerBound = Math.max(lowerBound, (entry.time - starts.get(entry.trackId)) / track.timescale)
    }
  }

  const last = await findLastFragment(src, moov, first, randomAccess)
  let seconds = 0
  let exact = !!last?.final
  for (const fragment of last ? parseMoof(last.bytes, movie) : []) {
    if (fragment.base === null || !starts.has(fragment.trackId)) {
      exact = false
      continue
    }
    seconds = Math.max(seconds, (fragment.base + fragment.ticks - starts.get(fragment.trackId)) / fragment.timescale)
    if (!fragment.complete) exact = false
  }
  return { seconds: Math.max(seconds, lowerBound), exact: exact && seconds > 0 && seconds >= lowerBound }
}

async function isoBmffDuration(src) {
  const located = await locateMoov(src)
  if (!located.moov) return unknownDuration(located.reason)
  const { moov } = located
  if (moov.size > MAX_MOOV_BYTES || moov.end > src.size) return unknownDuration('iso-moov-unreadable')
  const movie = parseMoov(await src.read(moov.start, moov.end))
  if (!movie) return unknownDuration('iso-moov-unparseable')
  const movieSeconds = movie.duration / movie.timescale
  const fragmentSeconds = movie.fragmentDuration / movie.timescale
  if (!movie.fragmented) {
    return isPositiveSeconds(movieSeconds)
      ? { seconds: movieSeconds, exact: true, streamed: false }
      : unknownDuration('iso-no-duration')
  }
  const timeline = await fragmentTimeline(src, moov, movie)
  if (timeline.exact) return { seconds: timeline.seconds, exact: true, streamed: true }
  const best = Math.max(movieSeconds, fragmentSeconds, timeline.seconds)
  if (!isPositiveSeconds(best)) return unknownDuration('iso-fragments-unmeasured', true)
  return { seconds: best, exact: fragmentSeconds > 0 && fragmentSeconds >= timeline.seconds, streamed: true }
}

function readVint(bytes, at, maxLength, keepMarker) {
  const first = bytes[at]
  if (first === undefined || first === 0) return null
  let length = 1
  while (!(first & (0x80 >> (length - 1)))) length += 1
  if (length > maxLength || at + length > bytes.length) return null
  const valueMask = (0x80 >> (length - 1)) - 1
  let value = keepMarker ? first : first & valueMask
  let allOnes = (first & valueMask) === valueMask
  for (let i = 1; i < length; i += 1) {
    value = value * 256 + bytes[at + i]
    if (bytes[at + i] !== 0xff) allOnes = false
  }
  return { length, value, unknown: !keepMarker && allOnes }
}

function readElement(bytes, at) {
  const id = readVint(bytes, at, 4, true)
  if (!id) return null
  const size = readVint(bytes, at + id.length, 8, false)
  if (!size || (!size.unknown && !Number.isSafeInteger(size.value))) return null
  const dataStart = at + id.length + size.length
  return {
    id: id.value,
    start: at,
    dataStart,
    size: size.unknown ? null : size.value,
    end: size.unknown ? null : dataStart + size.value,
  }
}

function readUnsigned(bytes, at, length) {
  if (length < 1 || length > 8 || at + length > bytes.length) return null
  let value = 0
  for (let i = 0; i < length; i += 1) value = value * 256 + bytes[at + i]
  return value
}

function readFloat(bytes, at, length) {
  if ((length !== 4 && length !== 8) || at + length > bytes.length) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset + at, length)
  return length === 4 ? view.getFloat32(0) : view.getFloat64(0)
}

function blockRelative(bytes, dataStart, end) {
  const track = readVint(bytes, dataStart, 8, false)
  if (!track) return null
  const at = dataStart + track.length
  if (at + 2 > Math.min(end, bytes.length)) return null
  const raw = (bytes[at] << 8) | bytes[at + 1]
  return raw >= 0x8000 ? raw - 0x10000 : raw
}

function blockGroupTimes(bytes, group) {
  const end = Math.min(group.end, bytes.length)
  let at = group.dataStart
  let relative = null
  let duration = 0
  while (at < end) {
    const child = readElement(bytes, at)
    if (!child || child.end === null) break
    if (child.id === BLOCK_ID) relative = blockRelative(bytes, child.dataStart, child.end)
    else if (child.id === BLOCK_DURATION_ID && child.end <= end) duration = readUnsigned(bytes, child.dataStart, child.size) || 0
    if (child.end > end) break
    at = child.end
  }
  return relative === null ? null : { relative, duration }
}

function parseSegmentInfo(bytes, head) {
  let at = 0
  while (at < bytes.length) {
    const element = readElement(bytes, at)
    if (!element || element.end === null || element.end > bytes.length) return
    if (element.id === TIMESTAMP_SCALE_ID) {
      const scale = readUnsigned(bytes, element.dataStart, element.size)
      if (scale > 0) head.scale = scale
    } else if (element.id === DURATION_ID) {
      const duration = readFloat(bytes, element.dataStart, element.size)
      if (isPositiveSeconds(duration)) head.duration = duration
    }
    at = element.end
  }
}

async function readFirstClusterTimestamp(src, offset, cluster) {
  const limit = cluster.end === null ? src.size : Math.min(src.size, offset + cluster.end)
  const bytes = await src.read(offset + cluster.dataStart, Math.min(limit, offset + cluster.dataStart + 16 * 1024))
  let at = 0
  let timestamp = null
  let earliest = null
  while (at < bytes.length) {
    const child = readElement(bytes, at)
    if (!child || child.end === null || SEGMENT_LEVEL_IDS.includes(child.id)) break
    if (child.id === CLUSTER_TIMESTAMP_ID) {
      timestamp = readUnsigned(bytes, child.dataStart, child.size)
    } else if (child.id === SIMPLE_BLOCK_ID || child.id === BLOCK_GROUP_ID) {
      const relative = child.id === SIMPLE_BLOCK_ID
        ? blockRelative(bytes, child.dataStart, child.end)
        : blockGroupTimes(bytes, child)?.relative ?? null
      if (relative !== null) earliest = Math.min(earliest ?? Infinity, relative)
    }
    at = child.end
  }
  if (timestamp === null) return null
  return earliest === null ? timestamp : timestamp + earliest
}

async function readWebmHead(src) {
  const ebml = readElement(await src.read(0, 16), 0)
  if (!ebml || ebml.id !== EBML_ID || ebml.end === null) return null
  const segment = readElement(await src.read(ebml.end, ebml.end + 16), 0)
  if (!segment || segment.id !== SEGMENT_ID) return null
  const segmentStart = ebml.end + segment.dataStart
  const segmentEnd = segment.end === null ? src.size : Math.min(src.size, ebml.end + segment.end)
  const head = { segmentStart, scale: 1000000, duration: null, firstTimestamp: null }
  let offset = segmentStart
  for (let i = 0; i < 64 && offset < segmentEnd; i += 1) {
    const element = readElement(await src.read(offset, offset + 16), 0)
    if (!element) break
    if (element.id === CLUSTER_ID) {
      head.firstTimestamp = await readFirstClusterTimestamp(src, offset, element)
      break
    }
    if (element.end === null) break
    if (element.id === INFO_ID && element.size <= 64 * 1024) {
      parseSegmentInfo(await src.read(offset + element.dataStart, offset + element.end), head)
    }
    offset += element.end
  }
  return head
}

function walkLastCluster(bytes, at, budget) {
  const cluster = readElement(bytes, at)
  if (!cluster || cluster.id !== CLUSTER_ID) return null
  if (cluster.end !== null && cluster.end > bytes.length) return null
  const limit = cluster.end === null ? bytes.length : cluster.end
  let offset = cluster.dataStart
  let timestamp = null
  let lastEnd = null
  while (offset < limit) {
    budget.steps -= 1
    if (budget.steps <= 0) return null
    const child = readElement(bytes, offset)
    if (!child) return null
    if (cluster.end === null && SEGMENT_LEVEL_IDS.includes(child.id)) break
    if (child.end === null || child.end > limit) return null
    if (child.id === CLUSTER_TIMESTAMP_ID) {
      timestamp = readUnsigned(bytes, child.dataStart, child.size)
      if (timestamp === null) return null
    } else if (child.id === SIMPLE_BLOCK_ID || child.id === BLOCK_GROUP_ID) {
      if (timestamp === null) return null
      const times = child.id === SIMPLE_BLOCK_ID
        ? { relative: blockRelative(bytes, child.dataStart, child.end), duration: 0 }
        : blockGroupTimes(bytes, child)
      if (!times || times.relative === null) return null
      lastEnd = Math.max(lastEnd ?? -Infinity, timestamp + times.relative + times.duration)
    } else if (!CLUSTER_SKIPPED_IDS.includes(child.id)) {
      return null
    }
    offset = child.end
  }
  while (offset < bytes.length) {
    budget.steps -= 1
    if (budget.steps <= 0) return null
    const element = readElement(bytes, offset)
    if (!element || element.end === null || element.end > bytes.length || !TRAILING_ELEMENT_IDS.includes(element.id)) return null
    offset = element.end
  }
  if (timestamp === null) return null
  return lastEnd ?? timestamp
}

async function webmDuration(src) {
  const head = await readWebmHead(src)
  if (!head) return unknownDuration('webm-unparseable', true)
  const unit = head.scale / 1e9
  if (head.firstTimestamp !== null) {
    const lastEnd = await scanTail(src, head.segmentStart, (tail, from, limit, budget) => {
      for (let i = Math.min(tail.length - 4, limit - 1); i >= 0 && budget.candidates > 0 && budget.steps > 0; i -= 1) {
        if (tail[i] !== 0x1f || tail[i + 1] !== 0x43 || tail[i + 2] !== 0xb6 || tail[i + 3] !== 0x75) continue
        budget.candidates -= 1
        const end = walkLastCluster(tail, i, budget)
        if (end !== null) return end
      }
      return null
    })
    const timeline = lastEnd !== null && lastEnd >= head.firstTimestamp ? (lastEnd - head.firstTimestamp) * unit : null
    if (isPositiveSeconds(timeline)) return { seconds: timeline, exact: true, streamed: true }
  }
  const declared = head.duration !== null ? head.duration * unit : null
  if (isPositiveSeconds(declared)) return { seconds: declared, exact: true, streamed: true }
  return unknownDuration('webm-no-timeline', true)
}

async function readSourceDuration(src) {
  const magic = await src.read(0, 12)
  if (magic.length >= 4 && u32(magic, 0) === EBML_ID) return webmDuration(src)
  return isoBmffDuration(src)
}

function blobSource(blob) {
  return {
    size: blob.size,
    read: async (start, end) => {
      const from = Math.max(0, start)
      const to = Math.min(blob.size, end)
      if (to <= from) return new Uint8Array(0)
      return new Uint8Array(await blob.slice(from, to).arrayBuffer())
    },
    spare: () => Infinity,
  }
}

export async function readContainerDuration(blob) {
  if (!blob || typeof blob.slice !== 'function' || !blob.size) return unknownDuration('empty')
  try {
    return await readSourceDuration(blobSource(blob))
  } catch (err) {
    return unknownDuration(err?.message || 'unreadable')
  }
}

const REMOTE_BLOCK_BYTES = 64 * 1024
const REMOTE_MAX_REQUESTS = 16
const REMOTE_MAX_BYTES = 4 * 1024 * 1024
const REMOTE_TIMEOUT_MS = 4000

function parseContentRange(header) {
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+)$/i.exec(String(header || '').trim())
  if (!match) return null
  const [start, end, total] = match.slice(1).map(Number)
  if (![start, end, total].every(Number.isSafeInteger) || end < start || total <= end) return null
  return { start, end, total }
}

async function openRemoteSource(url, { fetchImpl, signal }) {
  const blocks = new Map()
  let requests = 0
  let fetchedBytes = 0
  let size = null

  const fetchBlocks = async (first, last) => {
    const start = first * REMOTE_BLOCK_BYTES
    const end = Math.min(size ?? Infinity, (last + 1) * REMOTE_BLOCK_BYTES) - 1
    if (requests >= REMOTE_MAX_REQUESTS || fetchedBytes + (end - start + 1) > REMOTE_MAX_BYTES) {
      throw new Error('range-budget-exceeded')
    }
    requests += 1
    const res = await fetchImpl(url, { headers: { Range: `bytes=${start}-${end}` }, signal })
    if (res.status === 400 || res.status === 404) {
      try { await res.body?.cancel?.() } catch {}
      throw new Error('object-missing')
    }
    const range = res.status === 206 ? parseContentRange(res.headers.get('content-range')) : null
    if (!range || range.start !== start || range.end !== Math.min(end, range.total - 1) || (size !== null && range.total !== size)) {
      try { await res.body?.cancel?.() } catch {}
      throw new Error(`range-unsupported-${res.status}`)
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength !== range.end - range.start + 1) throw new Error('range-short-read')
    if (size === null) size = range.total
    fetchedBytes += bytes.byteLength
    for (let index = first; index <= last && index * REMOTE_BLOCK_BYTES < size; index += 1) {
      const offset = (index - first) * REMOTE_BLOCK_BYTES
      blocks.set(index, bytes.subarray(offset, Math.min(bytes.byteLength, offset + REMOTE_BLOCK_BYTES)))
    }
  }

  const read = async (start, end, readAhead = 0) => {
    const from = Math.max(0, start)
    const to = Math.min(size, end)
    if (to <= from) return new Uint8Array(0)
    const first = Math.floor(from / REMOTE_BLOCK_BYTES)
    const last = Math.floor((to - 1) / REMOTE_BLOCK_BYTES)
    const aheadLast = Math.floor((Math.min(size, Math.max(to, from + readAhead)) - 1) / REMOTE_BLOCK_BYTES)
    const roomBlocks = () => Math.floor((REMOTE_MAX_BYTES - fetchedBytes) / REMOTE_BLOCK_BYTES)
    for (let index = first; index <= last; index += 1) {
      if (blocks.has(index)) continue
      let runEnd = index
      while (runEnd < aheadLast && !blocks.has(runEnd + 1) && (runEnd < last || runEnd - index + 1 < roomBlocks())) runEnd += 1
      await fetchBlocks(index, runEnd)
      index = runEnd
    }
    const out = new Uint8Array(to - from)
    for (let index = first; index <= last; index += 1) {
      const block = blocks.get(index)
      const blockStart = index * REMOTE_BLOCK_BYTES
      const copyFrom = Math.max(from, blockStart)
      const copyTo = Math.min(to, blockStart + (block ? block.byteLength : 0))
      if (copyTo <= copyFrom) throw new Error('range-short-read')
      out.set(block.subarray(copyFrom - blockStart, copyTo - blockStart), copyFrom - from)
    }
    return out
  }

  await fetchBlocks(0, 0)
  return {
    size,
    read,
    spare: () => Math.min(REMOTE_MAX_REQUESTS - requests, Math.floor((REMOTE_MAX_BYTES - fetchedBytes) / REMOTE_BLOCK_BYTES)),
    stats: () => ({ requests, fetchedBytes }),
  }
}

export async function readRemoteVideoDuration(url, { fetchImpl = globalThis.fetch, timeoutMs = REMOTE_TIMEOUT_MS } = {}) {
  if (!url || typeof url !== 'string' || typeof fetchImpl !== 'function') return unknownDuration('no-url')
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const src = await openRemoteSource(url, { fetchImpl, signal: controller?.signal })
    return { ...(await readSourceDuration(src)), ...src.stats() }
  } catch (err) {
    return unknownDuration(controller?.signal.aborted ? 'timeout' : err?.message || 'network')
  } finally {
    if (timer) clearTimeout(timer)
    if (controller) controller.abort()
  }
}

export async function verifyStoredVideoSeconds(url, reportedSeconds, options) {
  const reported = isPositiveSeconds(reportedSeconds) ? reportedSeconds : null
  const measured = await readRemoteVideoDuration(url, options)
  if (measured.reason === 'object-missing') {
    console.warn(`[video-duration] ${String(url).split('/').pop()} is not in storage; refusing the client value`)
    return null
  }
  if (!isPositiveSeconds(measured.seconds)) {
    console.warn(`[video-duration] could not measure ${String(url).split('/').pop()} (${measured.reason}); using the client value`)
    return reported
  }
  const seconds = measured.seconds
  const recorderDrift = measured.streamed && reported !== null && seconds > reported && seconds - reported <= RECORDER_DRIFT_SECONDS
  if (measured.exact) return recorderDrift ? reported : seconds
  if (reported === null) return null
  return recorderDrift ? reported : Math.max(seconds, reported)
}

function readElementDuration(file, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    let url = null
    let video = null
    let settled = false
    let timer = null
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (video) {
        video.onloadedmetadata = null
        video.ondurationchange = null
        video.ontimeupdate = null
        video.onseeked = null
        video.onerror = null
        video.removeAttribute('src')
        try { video.load() } catch {}
      }
      if (url) { try { URL.revokeObjectURL(url) } catch {} }
      resolve(Number.isFinite(value) && value > 0 ? value : null)
    }
    try {
      url = URL.createObjectURL(file)
      video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      const settleIfFinite = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) finish(video.duration)
      }
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) {
          finish(video.duration)
          return
        }
        if (video.duration === Infinity) {
          video.ondurationchange = settleIfFinite
          video.ontimeupdate = settleIfFinite
          video.onseeked = () => {
            settleIfFinite()
            if (!settled) {
              setTimeout(() => {
                settleIfFinite()
                finish(null)
              }, 750)
            }
          }
          try { video.currentTime = Number.MAX_SAFE_INTEGER } catch { finish(null) }
          return
        }
        finish(null)
      }
      video.onerror = () => finish(null)
      timer = setTimeout(() => finish(null), timeoutMs)
      video.src = url
    } catch {
      finish(null)
    }
  })
}

export async function probeVideoDuration(file) {
  if (!file) return null
  const container = await readContainerDuration(file)
  const containerSeconds = isPositiveSeconds(container.seconds) ? container.seconds : null
  const elementSeconds = typeof document === 'undefined'
    ? null
    : await readElementDuration(file, { timeoutMs: containerSeconds ? 4000 : 10000 })
  const known = [containerSeconds, elementSeconds].filter(isPositiveSeconds)
  return known.length ? Math.max(...known) : null
}

export async function captureVideoPoster(file, { maxEdge = 640, quality = 0.75 } = {}) {
  let video, url
  try {
    ({ video, url } = await loadVideoElement(file))
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const { width, height } = fitDimensions(
      video.videoWidth || 640,
      video.videoHeight || 360,
      maxEdge
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const candidates = [duration * 0.1, duration * 0.25, duration * 0.5, 0]
      .filter((t) => Number.isFinite(t) && t >= 0)

    for (const t of candidates) {
      try {
        await drawFrameAt(video, canvas, t)
        if (!isBlankFrame(canvas)) break
      } catch {
      }
    }

    if (isBlankFrame(canvas)) {
      console.warn('[videoCompress] no non-black frame found; storing no poster for', file?.name)
      return null
    }

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return null

    const base = (file.name || 'video').replace(/\.[^.]+$/, '')
    return new File([blob], `${base}_poster.jpg`, { type: 'image/jpeg' })
  } catch (err) {
    console.warn('[videoCompress] poster capture failed:', err)
    return null
  } finally {
    if (video) { try { video.pause() } catch {} video.removeAttribute('src'); video.load?.() }
    if (url) URL.revokeObjectURL(url)
  }
}

export async function transcodeVideo(file, {
  maxEdge = 1280,
  videoBitsPerSecond = 1_500_000,
  audioBitsPerSecond = 96_000,
  onProgress,
} = {}) {
  if (!canTranscodeVideo()) {
    return { file, transcoded: false, durationSec: null, reason: 'unsupported' }
  }

  const mimeType = pickMimeType()
  let video, url, recorder, rafId, cleanupVisibility, audioCtx

  try {
    ({ video, url } = await loadVideoElement(file))

    const durationSec = Number.isFinite(video.duration) ? video.duration : null
    const { width, height } = fitDimensions(
      video.videoWidth || 1280,
      video.videoHeight || 720,
      maxEdge
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })

    const canvasStream = canvas.captureStream(FPS)

    const audio = await acquireAudio(video)
    if (!audio) {
      return { file, transcoded: false, durationSec, reason: 'no-audio-capture' }
    }

    audioCtx = audio.audioCtx
    const audioTracks = audio.tracks

    if (audio.needsUnmuted) {
      video.muted = false
      video.volume = 1
    }

    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ])

    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
      ...(audioTracks.length ? { audioBitsPerSecond } : {}),
    })

    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    const recordingDone = new Promise((resolve, reject) => {
      recorder.onstop = resolve
      recorder.onerror = (e) => reject(e.error || new Error('MediaRecorder failed'))
    })

    let framesDrawn = 0
    let wasHidden = typeof document !== 'undefined' && document.hidden

    const onVisibilityChange = () => { if (document.hidden) wasHidden = true }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    cleanupVisibility = () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }

    const drawLoop = () => {
      if (video.ended) return
      ctx.drawImage(video, 0, 0, width, height)
      framesDrawn += 1
      if (onProgress && durationSec) {
        onProgress(Math.min(0.99, video.currentTime / durationSec))
      }
      rafId = requestAnimationFrame(drawLoop)
    }

    video.currentTime = 0

    try {
      await video.play()
    } catch (playErr) {
      console.warn('[videoCompress] playback refused, keeping original:', playErr)
      return { file, transcoded: false, durationSec, reason: 'autoplay-blocked' }
    }

    const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
    ctx.drawImage(video, 0, 0, width, height)
    recorder.start(1000)
    const recordingStartedAt = clock()
    drawLoop()

    await waitForEvent(video, 'ended', {
      timeoutMs: Math.max(30000, (durationSec || 60) * 1000 * 2 + 15000),
    })

    if (rafId) cancelAnimationFrame(rafId)
    recorder.requestData?.()
    recorder.stop()
    const recordedSeconds = (clock() - recordingStartedAt) / 1000
    const playedSeconds = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime
    await recordingDone

    if (wasHidden) {
      return { file, transcoded: false, durationSec, reason: 'backgrounded' }
    }

    if (playedSeconds > 0 && recordedSeconds > playedSeconds + MAX_RECORDING_OVERRUN_SECONDS) {
      console.warn(
        `[videoCompress] recording ran ${recordedSeconds.toFixed(1)}s for a ${playedSeconds.toFixed(1)}s clip — ` +
        'playback stalled; keeping the original.'
      )
      return { file, transcoded: false, durationSec, reason: 'stalled' }
    }

    if (durationSec && framesDrawn < durationSec * FPS * 0.33) {
      console.warn(
        `[videoCompress] only ${framesDrawn} frames drawn for a ${durationSec.toFixed(1)}s clip — ` +
        'render loop was throttled; keeping the original.'
      )
      return { file, transcoded: false, durationSec, reason: 'throttled' }
    }

    const blob = new Blob(chunks, { type: mimeType })

    if (!blob.size || blob.size >= file.size) {
      return { file, transcoded: false, durationSec, reason: 'no-gain' }
    }

    const base = (file.name || 'video').replace(/\.[^.]+$/, '')
    const out = new File([blob], `${base}.${extensionFor(mimeType)}`, { type: mimeType })

    onProgress?.(1)
    return { file: out, transcoded: true, durationSec }
  } catch (err) {
    console.warn('[videoCompress] transcode failed, uploading original:', err)
    try { recorder?.state === 'recording' && recorder.stop() } catch {}
    return { file, transcoded: false, durationSec: null, reason: 'error' }
  } finally {
    cleanupVisibility?.()
    if (rafId) cancelAnimationFrame(rafId)
    if (video) { try { video.pause() } catch {} video.removeAttribute('src'); video.load?.() }
    if (audioCtx) { try { await audioCtx.close() } catch {} }
    if (url) URL.revokeObjectURL(url)
  }
}
