// Browser-side video transcoding + poster capture.
//
// WHY THIS EXISTS
// ---------------
// Images went through browser-image-compression; videos were uploaded raw. So a
// 58-second phone clip arrived as 126MB and Supabase Storage rejected it with
// "The object exceeded the maximum allowed size" (item 3), and every video that
// DID fit was stored at full size, which is a storage bill waiting to happen
// (item 7). A 20MB upload downloaded back as 20MB because nothing ever shrank it.
//
// HOW
// ---
// No new dependencies and no WASM: we replay the video into a downscaled
// <canvas>, capture that canvas as a MediaStream, graft the original audio track
// onto it, and re-encode with MediaRecorder. A 1-minute clip lands at roughly
// 10-25MB depending on tier.
//
// TRADE-OFFS, stated plainly:
//   • Encoding is REAL-TIME. A 60s clip takes ~60s. That's why onProgress exists
//     and why the upload button shows a percentage — without it this feels broken.
//   • Output is H.264/MP4 wherever MediaRecorder supports it (Chrome 126+,
//     Safari), because WebM/VP9 does not play reliably on iOS. WebM is only used
//     as a last resort, when MP4 recording is unavailable (e.g. Firefox).
//   • If ANYTHING fails — unsupported browser, decode error, or a result that
//     came out no smaller than the input — we return the ORIGINAL file untouched
//     rather than block the upload or ship a corrupt clip.

const FPS = 30

// Ordered by preference. MP4/H.264 first: it is the only container that plays
// everywhere, including iOS Safari, which is where these albums get viewed.
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
      /* isTypeSupported can throw on malformed types in older browsers */
    }
  }
  return null
}

export function canTranscodeVideo() {
  if (typeof window === 'undefined') return false
  if (typeof MediaRecorder === 'undefined') return false
  if (typeof HTMLCanvasElement === 'undefined') return false
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return false

  // We also need the source's AUDIO, or we'd ship a silent video. There are two
  // ways to get it, and Safari only has the second one — see acquireAudio().
  if (!hasAudioCapture()) return false

  return pickMimeType() !== null
}

// Can we get an audio MediaStreamTrack out of a <video> element?
//
// SAFARI DOES NOT IMPLEMENT HTMLMediaElement.captureStream() — desktop or iOS.
// Gating on it meant Safari skipped the transcode entirely and uploaded the raw
// file, which is precisely the 126MB iPhone clip that started this. Safari does
// support WebAudio's createMediaElementSource + MediaStreamAudioDestinationNode,
// which gets us the same audio track by a different route.
function hasAudioCapture() {
  const media = typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null
  if (media && (typeof media.captureStream === 'function' || typeof media.mozCaptureStream === 'function')) {
    return true
  }
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
}

/**
 * Get the video's audio as MediaStreamTracks.
 *
 * Returns { tracks, audioCtx, needsUnmuted }. `audioCtx` must be closed by the
 * caller. `needsUnmuted` is true for the WebAudio path: `muted` silences the
 * element BEFORE the audio reaches the WebAudio graph, so we have to leave the
 * element unmuted. That's safe — the graph is wired to a MediaStream sink and
 * NOT to audioCtx.destination, so nothing comes out of the speakers.
 */
async function acquireAudio(video) {
  // Chrome / Firefox: captureStream carries audio even while the element is muted.
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

  // Safari.
  const AudioCtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AudioCtor) return null

  try {
    const audioCtx = new AudioCtor()
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume() } catch { /* may need a gesture; play() will tell us */ }
    }
    const source = audioCtx.createMediaElementSource(video)
    const destination = audioCtx.createMediaStreamDestination()
    source.connect(destination)   // deliberately NOT connected to audioCtx.destination
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

// Load a File into a detached <video> and wait until it has real frame data.
// `loadeddata` (not `loadedmetadata`) is the point at which drawImage yields
// actual pixels instead of a black frame.
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

// Even dimensions — H.264 requires them, and odd sizes make some encoders bail.
function fitDimensions(width, height, maxEdge) {
  const longest = Math.max(width, height)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  const even = (n) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

// Seek to a frame and draw it. Used for the poster (item 2).
//
// `seeked` fires before the frame is guaranteed to be painted, which is exactly
// why the existing poster code produced black JPEGs. We wait for
// requestVideoFrameCallback where available (the only real signal that a frame
// is ready), and fall back to a double rAF otherwise.
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
      // Safety net: rVFC never fires for a paused element in some browsers.
      setTimeout(resolve, 400)
    } else {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    }
  })

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
}

// True if the canvas is (near-)uniformly black — i.e. we captured nothing
// useful. Sampling a sparse grid keeps this cheap.
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

/**
 * Capture a poster frame from a video File.
 * Tries a few timestamps because the opening frames of a clip are very often
 * black (fade-ins, camera warm-up) — which is what made thumbnails black.
 *
 * @returns {Promise<File|null>} JPEG poster, or null if no usable frame exists.
 */
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

    // 10% in usually clears any fade-in; then 25%, 50%; 0s only as a last resort.
    const candidates = [duration * 0.1, duration * 0.25, duration * 0.5, 0]
      .filter((t) => Number.isFinite(t) && t >= 0)

    for (const t of candidates) {
      try {
        await drawFrameAt(video, canvas, t)
        if (!isBlankFrame(canvas)) break
      } catch {
        /* try the next timestamp */
      }
    }

    // If EVERY seek failed or every frame came back black, the canvas was never
    // drawn — and a never-drawn canvas is transparent, which flattens to BLACK
    // when encoded as JPEG. Publishing that would bake a black thumbnail into
    // the database permanently: a stored poster takes MediaThumbnail's fast
    // path and never reaches the runtime fallback that would have caught it.
    // Returning null means "no poster", and the runtime fallback handles it.
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

/**
 * Re-encode a video to a smaller resolution/bitrate.
 *
 * @returns {Promise<{file: File, transcoded: boolean, durationSec: number|null, reason?: string}>}
 *          `file` is the original when transcoding was skipped or didn't help.
 */
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

    // Graft the source's audio onto the canvas stream. The canvas only carries
    // pixels, so without this we would ship a SILENT video — and for family
    // memories, losing the sound is far worse than keeping a large file.
    //
    // If we can't get the audio at all we do NOT transcode: a silent re-encode
    // is smaller than the original, so it would sail past the size check below
    // and quietly destroy the sound. Uploading the original is the safe failure.
    const audio = await acquireAudio(video)
    if (!audio) {
      return { file, transcoded: false, durationSec, reason: 'no-audio-capture' }
    }

    audioCtx = audio.audioCtx
    const audioTracks = audio.tracks

    // WebAudio path (Safari): `muted` silences the element before its audio ever
    // reaches the graph, so the element has to play unmuted. Nothing is audible
    // regardless — acquireAudio() wires the graph to a MediaStream sink, never to
    // audioCtx.destination.
    if (audio.needsUnmuted) {
      video.muted = false
      video.volume = 1
    }

    // Zero audio tracks means the clip genuinely has no sound, not that capture
    // failed — both routes mirror the element's actual tracks. Safe to proceed.
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

    // THE FROZEN-FRAME TRAP
    // ---------------------
    // The draw loop runs on requestAnimationFrame, which browsers suspend
    // entirely in a background tab. The video keeps decoding, the canvas keeps
    // being captured at 30fps, and MediaRecorder keeps recording — but the
    // canvas still holds whatever frame was last painted. So if the user
    // switches apps (very likely: this takes as long as the clip itself), the
    // output is a single frozen still with perfectly good audio over it.
    //
    // And that file is SMALLER than the original, so it sails past the
    // "did it help?" check below and replaces a real memory with a still frame.
    //
    // Two defences: bail out the moment the page is hidden, and afterwards
    // verify we actually painted roughly as many frames as the clip's length
    // implies.
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
      // On the WebAudio path the element plays UNMUTED (see acquireAudio), so a
      // browser that hasn't registered a user gesture will refuse. The file
      // picker click normally counts, but don't gamble a memory on it: keep the
      // original rather than encoding a stalled, empty stream.
      console.warn('[videoCompress] playback refused, keeping original:', playErr)
      return { file, transcoded: false, durationSec, reason: 'autoplay-blocked' }
    }

    // Paint the first frame BEFORE the recorder opens, so the output doesn't
    // start with a black lead-in (the canvas is opaque black until first draw).
    ctx.drawImage(video, 0, 0, width, height)
    recorder.start(1000)
    drawLoop()

    await waitForEvent(video, 'ended', {
      // Real-time encode: allow the clip's own length plus generous slack.
      timeoutMs: Math.max(30000, (durationSec || 60) * 1000 * 2 + 15000),
    })

    if (rafId) cancelAnimationFrame(rafId)
    // Flush the final frames before closing the muxer.
    recorder.requestData?.()
    recorder.stop()
    await recordingDone

    if (wasHidden) {
      return { file, transcoded: false, durationSec, reason: 'backgrounded' }
    }

    // Sanity-check the frame count. rAF should give us ~60fps; anything under a
    // third of the clip's worth of frames means the loop was throttled and the
    // picture is (partly) frozen. Keep the original rather than ship that.
    if (durationSec && framesDrawn < durationSec * FPS * 0.33) {
      console.warn(
        `[videoCompress] only ${framesDrawn} frames drawn for a ${durationSec.toFixed(1)}s clip — ` +
        'render loop was throttled; keeping the original.'
      )
      return { file, transcoded: false, durationSec, reason: 'throttled' }
    }

    const blob = new Blob(chunks, { type: mimeType })

    // If re-encoding didn't actually help (already well-compressed, or very
    // short), keep the original — no point storing a bigger file.
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
    // The WebAudio graph holds the decoder alive; leaking one AudioContext per
    // upload eventually hits the browser's hard limit (~6) and every later
    // transcode fails.
    if (audioCtx) { try { await audioCtx.close() } catch {} }
    if (url) URL.revokeObjectURL(url)
  }
}
