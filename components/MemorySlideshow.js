import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getCoverPoster } from '../lib/posters'

const getCleanDescription = (post) => {
  if (!post.description) return ''

  if (post.type === 'multi-photo' && post.file_urls) {
    return post.description
  }

  if (post.description.includes('__MULTI_PHOTO_URLS__:')) {
    const marker = '__MULTI_PHOTO_URLS__:'
    const markerIndex = post.description.indexOf(marker)
    return post.description.substring(0, markerIndex).trim()
  }

  return post.description
}

const fisherYatesShuffle = (arr) => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const SLIDE_DURATION_MS = 4000

export default function MemorySlideshow({ isOpen, onClose, memories = [] }) {
  const { t } = useLanguage()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledMemories, setShuffledMemories] = useState([])

  useEffect(() => {
    if (isOpen) {
      setIsShuffled(false)
      setShuffledMemories([])
      setCurrentIndex(0)
      setIsPlaying(true)
    }
  }, [isOpen])

  const currentMemories = isShuffled && shuffledMemories.length > 0 ? shuffledMemories : memories

  useEffect(() => {
    if (!isPlaying || currentMemories.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentMemories.length)
    }, SLIDE_DURATION_MS)

    return () => clearInterval(interval)
  }, [isPlaying, currentMemories.length, currentIndex])

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
  }, [currentMemories.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + currentMemories.length) % currentMemories.length)
  }, [currentMemories.length])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const next = !prev
      if (next) {
        setShuffledMemories(fisherYatesShuffle(memories))
      }
      return next
    })
    setCurrentIndex(0)
  }, [memories])

  if (!isOpen) return null
  if (memories.length === 0) return null

  const safeIndex = Math.min(currentIndex, currentMemories.length - 1)
  const currentMemory = currentMemories[safeIndex] || memories[0]
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
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        gap: '6px',
        zIndex: 1001
      }}>
        {currentMemories.map((_, index) => {
          const isPast = index < safeIndex
          const isCurrent = index === safeIndex
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: '3px',
                background: 'rgba(255, 255, 255, 0.18)',
                borderRadius: '999px',
                overflow: 'hidden',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <div
                key={isCurrent ? `active-${currentIndex}-${isPlaying}` : `static-${index}`}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-iris), var(--accent-aqua))',
                  borderRadius: '999px',
                  transformOrigin: 'left',
                  transform: isPast ? 'scaleX(1)' : 'scaleX(0)',
                  animation: isCurrent
                    ? `story-progress ${SLIDE_DURATION_MS}ms linear forwards`
                    : 'none',
                  animationPlayState: isCurrent && !isPlaying ? 'paused' : 'running',
                  willChange: isCurrent ? 'transform' : 'auto',
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{
        position: 'absolute',
        top: '40px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 1001
      }}>
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
          title={isShuffled ? t('shuffleOff') : t('shuffleOn')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
        </button>

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
            src={fileUrl}
            poster={getCoverPoster(currentMemory) || undefined}
            autoPlay
            muted
            controls
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)'
            }}
            onPlay={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(true)}
          />
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

        {currentMemories.length > 1 && (
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

      {(currentMemory.title || getCleanDescription(currentMemory)) && (
        <div
          className="glass-strong slideshow-caption"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            borderRadius: '20px',
            textAlign: 'center',
            background: 'rgba(20, 20, 24, 0.55)',
            border: '1px solid rgba(255,255,255,0.14)',
            overflow: 'hidden',
          }}
        >
          {currentMemory.title && (
            <h3 className="slideshow-caption-title" style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {currentMemory.title}
            </h3>
          )}
          {getCleanDescription(currentMemory) && (
            <p className="slideshow-caption-body" style={{
              margin: 0,
              opacity: 0.85,
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
            }}>
              {getCleanDescription(currentMemory)}
            </p>
          )}

          <style jsx>{`
            .slideshow-caption {
              position: absolute;
              bottom: 40px;
              padding: 14px 22px;
              max-width: 80vw;
              max-height: 30vh;
            }
            .slideshow-caption-title { font-size: 17px; margin-bottom: 6px !important; }
            .slideshow-caption-body {
              font-size: 14px;
              line-height: 1.5;
              -webkit-line-clamp: 4;
            }
            @media (max-width: 768px) {
              .slideshow-caption {
                padding: 10px 14px;
                bottom: 24px;
                max-width: 92vw;
                max-height: 22vh;
              }
              .slideshow-caption-title { font-size: 14px; margin-bottom: 4px !important; }
              .slideshow-caption-body {
                font-size: 12px;
                line-height: 1.4;
                -webkit-line-clamp: 3;
              }
            }
          `}</style>
        </div>
      )}

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
        {safeIndex + 1} / {currentMemories.length}
      </div>
    </div>
  )
}
