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
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease-out'
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
        gap: '4px',
        zIndex: 1001
      }}>
        {currentMemories.map((_, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${progress}%` : '0%',
                height: '100%',
                backgroundColor: 'white',
                borderRadius: '2px',
                transition: index !== currentIndex ? 'width 0.2s ease' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 1001
      }}>
        {/* Shuffle button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleShuffle()
          }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isShuffled ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = isShuffled ? 'rgba(59, 130, 246, 1)' : 'rgba(0, 0, 0, 0.8)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = isShuffled ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.5)'
          }}
          title={isShuffled ? 'Dezactivează shuffle' : 'Activează shuffle'}
        >
          🔀
        </button>
        
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'}
        >
          ✕
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
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
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
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          />
        )}

        {/* Navigation arrows */}
        {memories.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              style={{
                position: 'absolute',
                left: window.innerWidth < 768 ? '10px' : '-60px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1002
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
                e.target.style.transform = 'translateY(-50%) scale(1.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
                e.target.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              ‹
            </button>
            
            <button
              onClick={goToNext}
              style={{
                position: 'absolute',
                right: window.innerWidth < 768 ? '10px' : '-60px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1002
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
                e.target.style.transform = 'translateY(-50%) scale(1.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
                e.target.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Memory info */}
      {(currentMemory.title || getCleanDescription(currentMemory)) && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          maxWidth: '80vw',
          textAlign: 'center'
        }}>
          {currentMemory.title && (
            <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '18px' }}>
              {currentMemory.title}
            </h3>
          )}
          {getCleanDescription(currentMemory) && (
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
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
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
          e.target.style.transform = 'scale(1.1)'
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
          e.target.style.transform = 'scale(1)'
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px 12px',
        borderRadius: '20px'
      }}>
        {currentIndex + 1} / {memories.length}
      </div>
    </div>
  )
}