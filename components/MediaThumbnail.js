import { useState, useRef, useEffect } from 'react'
import LazyImage from './LazyImage'
import { useLanguage } from '../contexts/LanguageContext'

// Helper function to detect video files
const isVideoUrl = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg', '.m4v']
  const lowercaseUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowercaseUrl.includes(ext))
}

// Is the canvas (near-)uniformly black? A canvas with no decoded frame is
// transparent, and transparent flattens to BLACK once encoded as JPEG — which
// is exactly why "successful" thumbnails were coming out black.
const isBlankCanvas = (canvas) => {
  try {
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    if (!width || !height) return true
    let sampled = 0
    let lit = 0
    const step = Math.max(1, Math.floor(Math.min(width, height) / 12))
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
        sampled += 1
        if (r + g + b > 24) lit += 1
      }
    }
    return sampled === 0 || lit / sampled < 0.02
  } catch {
    return true // tainted canvas — treat as unusable
  }
}

// Component to display media (image or video) as a thumbnail.
//
// `poster` is the frame captured at upload time (photos.poster_urls). When it's
// present we just render it — no video is downloaded or decoded at all. The
// runtime capture below is only a fallback for videos uploaded before posters
// existed.
export default function MediaThumbnail({
  src,
  alt,
  poster,
  className,
  style,
  onError,
  showPlayIcon = true,
  ...props
}) {
  const { t } = useLanguage()
  const [thumbnailSrc, setThumbnailSrc] = useState(null)
  const [isVideo, setIsVideo] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)

  useEffect(() => {
    if (!src) return

    const isVid = isVideoUrl(src)
    setIsVideo(isVid)

    if (!isVid) {
      setThumbnailSrc(src)
      setThumbnailLoaded(true)
      return
    }

    // Fast path: a poster was stored at upload time.
    if (poster) {
      setThumbnailSrc(poster)
      setThumbnailLoaded(true)
      return
    }

    // Clear the previous media's thumbnail before decoding the new one.
    // Without this, a component instance reused with a different `src` (a
    // carousel, or a list keyed by index) keeps showing the OLD picture for as
    // long as the capture takes — up to 15s — and an image→video swap renders
    // the old photo with a ▶ badge stamped on it.
    setThumbnailSrc(null)
    setThumbnailLoaded(false)

    let cancelled = false
    generateVideoThumbnail(src, () => cancelled)
    return () => { cancelled = true }
  }, [src, poster])

  // Legacy fallback: decode a frame in the browser.
  //
  // The old version drew on `seeked`, which fires before the frame is actually
  // painted, so it captured an empty (=> black) canvas and then reported
  // success. Now we wait for a real frame via requestVideoFrameCallback, and we
  // verify the result isn't blank — retrying at a later timestamp if it is,
  // since the first second of a clip is very often black.
  const generateVideoThumbnail = async (videoUrl, isCancelled) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const cleanup = () => {
      try { video.pause() } catch {}
      video.removeAttribute('src')
      try { video.load() } catch {}
    }

    const waitFor = (event, timeoutMs) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout: ${event}`)), timeoutMs)
        video.addEventListener(event, () => { clearTimeout(timer); resolve() }, { once: true })
        video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('video error')) }, { once: true })
      })

    try {
      video.src = videoUrl
      video.load()
      await waitFor('loadeddata', 15000)
      if (isCancelled()) return cleanup()

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 480
      canvas.height = video.videoHeight || 360
      const ctx = canvas.getContext('2d')

      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const timestamps = [Math.min(1, duration * 0.1), duration * 0.25, duration * 0.5, 0]
        .filter((t) => Number.isFinite(t) && t >= 0)

      for (const t of timestamps) {
        if (isCancelled()) return cleanup()
        try {
          video.currentTime = Math.min(t, Math.max(0, duration - 0.05))
          await waitFor('seeked', 8000)

          // Wait for a frame to actually exist before reading pixels.
          await new Promise((resolve) => {
            if (typeof video.requestVideoFrameCallback === 'function') {
              video.requestVideoFrameCallback(() => resolve())
              setTimeout(resolve, 400)
            } else {
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            }
          })

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          if (!isBlankCanvas(canvas)) break
        } catch {
          /* try the next timestamp */
        }
      }

      if (isCancelled()) return cleanup()

      if (isBlankCanvas(canvas)) {
        // Never publish a black tile — show the 🎥 card instead.
        setThumbnailLoaded(false)
        return cleanup()
      }

      setThumbnailSrc(canvas.toDataURL('image/jpeg', 0.8))
      setThumbnailLoaded(true)
    } catch (error) {
      console.warn('Video thumbnail generation failed:', error)
      if (!isCancelled()) setThumbnailLoaded(false)
    } finally {
      cleanup()
    }
  }

  const playOrbStyle = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    background: 'var(--glass-2)',
    border: '1px solid var(--glass-hairline-strong)',
    backdropFilter: 'blur(14px) saturate(160%)',
    WebkitBackdropFilter: 'blur(14px) saturate(160%)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink-1)',
    fontSize: '11px',
    transition: 'box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
    zIndex: 1
  }

  // If it's a video but thumbnail generation failed, show video placeholder
  if (isVideo && !thumbnailLoaded) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--glass-1)',
          color: 'var(--ink-2)',
          position: 'relative'
        }}
        {...props}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎥</div>
          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{t('videoLabel')}</div>
        </div>
        {showPlayIcon && (
          <div style={playOrbStyle}>
            ▶
          </div>
        )}
      </div>
    )
  }

  // For images or successfully generated video thumbnails
  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <LazyImage
        src={thumbnailSrc}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={onError}
        {...props}
      />
      {isVideo && showPlayIcon && (
        <div style={playOrbStyle}>
          ▶
        </div>
      )}
    </div>
  )
}
