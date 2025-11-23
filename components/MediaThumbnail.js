import { useState, useRef, useEffect } from 'react'
import LazyImage from './LazyImage'

// Helper function to detect video files
const isVideoUrl = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg', '.m4v']
  const lowercaseUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowercaseUrl.includes(ext))
}

// Component to display media (image or video) as a thumbnail
export default function MediaThumbnail({ 
  src, 
  alt, 
  className,
  style,
  onError,
  showPlayIcon = true,
  ...props 
}) {
  const [thumbnailSrc, setThumbnailSrc] = useState(null)
  const [isVideo, setIsVideo] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!src) return

    const isVid = isVideoUrl(src)
    setIsVideo(isVid)

    if (isVid) {
      // Generate video thumbnail
      generateVideoThumbnail(src)
    } else {
      // It's an image, use it directly
      setThumbnailSrc(src)
      setThumbnailLoaded(true)
    }
  }, [src])

  const generateVideoThumbnail = async (videoUrl) => {
    try {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.onloadedmetadata = () => {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth || 480
        canvas.height = video.videoHeight || 360
      }

      video.onseeked = () => {
        try {
          // Draw the video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Convert canvas to data URL
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8)
          setThumbnailSrc(thumbnailDataUrl)
          setThumbnailLoaded(true)
        } catch (error) {
          console.error('Error generating video thumbnail:', error)
          // Fallback: use a placeholder or video icon
          setThumbnailLoaded(false)
        }
      }

      video.onerror = () => {
        console.error('Error loading video for thumbnail generation')
        setThumbnailLoaded(false)
      }

      // Load the video and seek to 1 second (or 10% of duration)
      video.src = videoUrl
      video.load()
      
      video.onloadeddata = () => {
        const seekTime = Math.min(1, video.duration * 0.1) // 1 second or 10% of duration
        video.currentTime = seekTime
      }

    } catch (error) {
      console.error('Error in video thumbnail generation:', error)
      setThumbnailLoaded(false)
    }
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
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          position: 'relative'
        }}
        {...props}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎥</div>
          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Video</div>
        </div>
        {showPlayIcon && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px'
          }}>
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
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '24px',
          height: '24px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          zIndex: 1
        }}>
          ▶
        </div>
      )}
    </div>
  )
}