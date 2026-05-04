import { useState, useEffect, useCallback } from 'react'

// Helper function to clean description from old multi-photo format
const getCleanDescription = (post) => {
  if (!post.description) return ''

  // If this is a new format multi-photo post, just return the description as-is
  if (post.type === 'multi-photo' && post.file_urls) {
    return post.description
  }

  // Clean up old format descriptions that contain URLs
  if (post.description.includes('__MULTI_PHOTO_URLS__:')) {
    const marker = '__MULTI_PHOTO_URLS__:'
    const markerIndex = post.description.indexOf(marker)
    return post.description.substring(0, markerIndex).trim()
  }

  return post.description
}

export default function MemorySlideshow({ isOpen, onClose, memories = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledMemories, setShuffledMemories] = useState([])

  // Debug logging
  console.log('MemorySlideshow rendered:', {
    isOpen,
    memoriesCount: memories.length,
    memories,
    shouldRender: isOpen && memories.length > 0
  })

  // Initialize shuffled memories
  useEffect(() => {
    if (memories.length > 0) {
      const shuffled = [...memories].sort(() => Math.random() - 0.5)
      setShuffledMemories(shuffled)
    }
  }, [memories])

  // Get current memories array (shuffled or normal)
  const currentMemories = isShuffled ? shuffledMemories : memories

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || currentMemories.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentMemories.length)
      setProgress(0)
    }, 4000) // 4 seconds per slide

    return () => clearInterval(interval)
  }, [isPlaying, currentMemories.length])

  // Progress bar animation
  useEffect(() => {
    if (!isPlaying || memories.length === 0) return

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + (100 / 40) // 4000ms / 100ms = 40 steps
      })
    }, 100)

    return () => clearInterval(progressInterval)
  }, [isPlaying, currentIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, isPlaying])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % currentMemories.length)
    setProgress(0)
  }, [currentMemories.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + currentMemories.length) % currentMemories.length)
    setProgress(0)
  }, [currentMemories.length])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(!isShuffled)
    setCurrentIndex(0)
    setProgress(0)
  }, [isShuffled])

  if (!isOpen) {
    console.log('MemorySlideshow not rendering - isOpen is false')
    return null
  }

  if (memories.length === 0) {
    console.log('MemorySlideshow not rendering - no memories')
    return null
  }

  console.log('MemorySlideshow WILL RENDER with', memories.length, 'memories')

  const currentMemory = currentMemories[currentIndex]
  const fileUrl = currentMemory?.fileUrl || currentMemory?.file_url
  const isVideo = currentMemory?.type === 'video' || currentMemory?.file_type === 'video' || fileUrl?.includes('.mp4')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
      }}
      onClick={onClose}
    >
      {/* Progress bars at top */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        gap: '6px',
        zIndex: 1001
      }}>
        {currentMemories.map((_, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: '3px',
              background: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '999px',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div
              style={{
                width: index < currentIndex ? '100%' :
                       index === currentIndex ? `${progress}%` : '0%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-iris), var(--accent-aqua))',
                borderRadius: '999px',
                transition: index !== currentIndex ? 'width 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 1001
      }}>
        {/* Shuffle button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleShuffle()
          }}
          className="btn-icon"
          style={{
            color: isShuffled ? '#fff' : 'rgba(255,255,255,0.85)',
            background: isShuffled
              ? 'linear-gradient(135deg, var(--accent-iris), #6366f1)'
              : 'rgba(255, 255, 255, 0.10)',
            borderColor: isShuffled ? 'transparent' : 'rgba(255,255,255,0.18)'
          }}
          title={isShuffled ? 'Dezactivează shuffle' : 'Activează shuffle'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-icon"
          style={{
            color: 'rgba(255,255,255,0.9)',
            background: 'rgba(255, 255, 255, 0.10)',
            borderColor: 'rgba(255,255,255,0.18)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Memory content */}
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            key={currentMemory.id}
            autoPlay
            muted
            controls
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)'
            }}
            onPlay={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(true)}
          >
            <source src={fileUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={fileUrl}
            alt={currentMemory.title || 'Memory'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)'
            }}
          />
        )}

        {/* Navigation arrows */}
        {memories.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="btn-icon"
              style={{
                position: 'absolute',
                left: window.innerWidth < 768 ? '10px' : '-72px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                color: 'rgba(255,255,255,0.95)',
                background: 'rgba(255, 255, 255, 0.10)',
                borderColor: 'rgba(255,255,255,0.18)',
                zIndex: 1002
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="btn-icon"
              style={{
                position: 'absolute',
                right: window.innerWidth < 768 ? '10px' : '-72px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                color: 'rgba(255,255,255,0.95)',
                background: 'rgba(255, 255, 255, 0.10)',
                borderColor: 'rgba(255,255,255,0.18)',
                zIndex: 1002
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Memory info */}
      {(currentMemory.title || getCleanDescription(currentMemory)) && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: '20px',
            maxWidth: '80vw',
            textAlign: 'center',
            background: 'rgba(20, 20, 24, 0.55)',
            border: '1px solid rgba(255,255,255,0.14)'
          }}
        >
          {currentMemory.title && (
            <h3 style={{ margin: 0, marginBottom: '6px', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {currentMemory.title}
            </h3>
          )}
          {getCleanDescription(currentMemory) && (
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.85, lineHeight: 1.5 }}>
              {getCleanDescription(currentMemory)}
            </p>
          )}
        </div>
      )}

      {/* Play/Pause button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsPlaying(!isPlaying)
        }}
        className="btn-icon"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          color: 'rgba(255,255,255,0.95)',
          background: 'rgba(255, 255, 255, 0.10)',
          borderColor: 'rgba(255,255,255,0.18)'
        }}
      >
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
        )}
      </button>

      {/* Counter */}
      <div
        className="glass-pill nums"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          padding: '8px 14px',
          background: 'rgba(255, 255, 255, 0.10)',
          border: '1px solid rgba(255,255,255,0.18)'
        }}
      >
        {currentIndex + 1} / {memories.length}
      </div>
    </div>
  )
}
