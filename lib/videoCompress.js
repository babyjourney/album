const FPS = 30

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

    ctx.drawImage(video, 0, 0, width, height)
    recorder.start(1000)
    drawLoop()

    await waitForEvent(video, 'ended', {
      timeoutMs: Math.max(30000, (durationSec || 60) * 1000 * 2 + 15000),
    })

    if (rafId) cancelAnimationFrame(rafId)
    recorder.requestData?.()
    recorder.stop()
    await recordingDone

    if (wasHidden) {
      return { file, transcoded: false, durationSec, reason: 'backgrounded' }
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
