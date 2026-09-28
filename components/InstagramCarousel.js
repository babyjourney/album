import { useState, useEffect, useRef, useCallback } from 'react'
import { getPosterForUrl } from '../lib/posters'

export default function InstagramCarousel({ images, currentIndex = 0, onIndexChange, post }) {
  const [index, setIndex] = useState(currentIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [velocityX, setVelocityX] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const lastTouchTime = useRef(0)
  const lastTouchX = useRef(0)

  const SNAP_THRESHOLD = 0.3
  const VELOCITY_THRESHOLD = 0.5

  const isVideoUrl = (url) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext))
  }

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  useEffect(() => {
    if (currentIndex !== index) {
      setIndex(currentIndex)
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
      setDragOffset(-currentIndex * containerWidth)
    }
  }, [currentIndex, index])

  const animateToIndex = useCallback((targetIndex) => {
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const targetOffset = -targetIndex * containerWidth
    setDragOffset(targetOffset)
    setIsDragging(false)
  }, [])

  const navigateToIndex = useCallback((newIndex) => {
    const clampedIndex = Math.max(0, Math.min(images.length - 1, newIndex))
    setIndex(clampedIndex)
    onIndexChange?.(clampedIndex)
    animateToIndex(clampedIndex)
  }, [images.length, onIndexChange, animateToIndex])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    
    const touch = e.touches[0]
    setIsDragging(true)
    setStartX(touch.clientX)
    setStartY(touch.clientY)
    setStartTime(Date.now())
    setVelocityX(0)
    lastTouchTime.current = Date.now()
    lastTouchX.current = touch.clientX

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    e.preventDefault()
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return
    
    const touch = e.touches[0]
    const currentTime = Date.now()
    const deltaTime = currentTime - lastTouchTime.current
    const deltaX = touch.clientX - lastTouchX.current
    
    const rawOffsetX = Math.abs(touch.clientX - startX)
    const rawOffsetY = Math.abs(touch.clientY - startY)
    
    const horizontalGestureThreshold = 10
    const verticalScrollAllowance = 2.0
    
    const isHorizontalGesture = rawOffsetX > horizontalGestureThreshold && 
                               rawOffsetX > rawOffsetY * verticalScrollAllowance
    
    if (isHorizontalGesture) {
      e.preventDefault()
      e.stopPropagation()
      const modalContainer = document.querySelector('.mobile-scroll-container')
      if (modalContainer) {
        modalContainer.style.touchAction = 'none'
      }
    }

    if (deltaTime > 0 && deltaTime < 100) {
      setVelocityX(deltaX / deltaTime)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const rawOffset = touch.clientX - startX
    
    let offset = rawOffset
    const currentTargetOffset = -index * containerWidth

    if (index === 0 && offset > 0) {
      offset = offset * 0.3
    } else if (index === images.length - 1 && offset < 0) {
      offset = offset * 0.3
    }

    setDragOffset(currentTargetOffset + offset)
    lastTouchTime.current = currentTime
    lastTouchX.current = touch.clientX
  }, [isDragging, startX, startY, index, images.length])

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging) return
    
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const deltaX = dragOffset + (index * containerWidth)
    const deltaTime = Date.now() - startTime
    const absVelocity = Math.abs(velocityX)

    setIsDragging(false)

    let newIndex = index
    
    const mobileVelocityThreshold = 0.3
    const mobileSnapThreshold = 0.25
    
    if (absVelocity > mobileVelocityThreshold) {
      if (velocityX < -mobileVelocityThreshold && index < images.length - 1) {
        newIndex = index + 1
      } else if (velocityX > mobileVelocityThreshold && index > 0) {
        newIndex = index - 1
      }
    }
    else if (Math.abs(deltaX) > containerWidth * mobileSnapThreshold) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    navigateToIndex(newIndex)
    
    if (containerRef.current) {
      containerRef.current.style.touchAction = 'auto'
    }
    
    const modalContainer = document.querySelector('.mobile-scroll-container')
    if (modalContainer) {
      modalContainer.style.touchAction = 'pan-y'
    }
  }, [isDragging, dragOffset, index, startTime, velocityX, images.length, navigateToIndex])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setStartTime(Date.now())
    setVelocityX(0)
    lastTouchTime.current = Date.now()
    lastTouchX.current = e.clientX
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()

    const currentTime = Date.now()
    const deltaTime = currentTime - lastTouchTime.current
    const deltaX = e.clientX - lastTouchX.current

    if (deltaTime > 0) {
      setVelocityX(deltaX / deltaTime)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const rawOffset = e.clientX - startX
    const currentTargetOffset = -index * containerWidth

    let offset = rawOffset
    if (index === 0 && offset > 0) {
      offset = offset * 0.2
    } else if (index === images.length - 1 && offset < 0) {
      offset = offset * 0.2
    }

    setDragOffset(currentTargetOffset + offset)
    lastTouchTime.current = currentTime
    lastTouchX.current = e.clientX
  }, [isDragging, startX, index, images.length])

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const deltaX = dragOffset + (index * containerWidth)
    const deltaTime = Date.now() - startTime
    const absVelocity = Math.abs(velocityX)

    setIsDragging(false)

    let newIndex = index
    
    if (absVelocity > VELOCITY_THRESHOLD) {
      if (velocityX < -VELOCITY_THRESHOLD && index < images.length - 1) {
        newIndex = index + 1
      } else if (velocityX > VELOCITY_THRESHOLD && index > 0) {
        newIndex = index - 1
      }
    }
    else if (Math.abs(deltaX) > containerWidth * SNAP_THRESHOLD) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    navigateToIndex(newIndex)
  }, [isDragging, dragOffset, index, startTime, velocityX, images.length, navigateToIndex])

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e)
      const handleGlobalMouseUp = (e) => handleMouseUp(e)
      
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const transform = `translate3d(${dragOffset}px, 0, 0)`

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'auto',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        transform: 'translateZ(0)',
        willChange: 'auto',
        WebkitOverflowScrolling: 'touch',
        WebkitTransform: 'translateZ(0)',
        WebkitPerspective: '1000px',
        WebkitBackfaceVisibility: 'hidden'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div 
        style={{
          display: 'flex',
          width: `${images.length * 100}%`,
          height: '100%',
          transform,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }}
      >
        {images.map((url, imgIndex) => (
          <div
            key={imgIndex}
            style={{
              width: `${100 / images.length}%`,
              height: '100%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
{isVideoUrl(url) ? (
              <video
                src={url}
                poster={getPosterForUrl(post, url) || undefined}
                controls
                playsInline
                preload="metadata"
                webkit-playsinline="true"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  ...(isDragging && imgIndex !== index && {
                    opacity: '0.9'
                  })
                }}
                onDragStart={(e) => e.preventDefault()}
                onError={() => console.error('Video failed to load:', url)}
              />
            ) : (
              <img
                src={url}
                alt={`${post?.title || 'Post'} - ${imgIndex + 1}/${images.length}`}
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  ...(isDragging && imgIndex !== index && {
                    opacity: '0.9'
                  })
                }}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(index - 1)
              }}
              className="modal-carousel-nav-arrow"
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20
              }}
            >
              ←
            </button>
          )}

          {index < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(index + 1)
              }}
              className="modal-carousel-nav-arrow"
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20
              }}
            >
              →
            </button>
          )}
        </>
      )}

      {images.length > 1 && (() => {
        return (
          <div
            className="glass-pill"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 30,
              padding: '6px 12px',
              borderRadius: '14px',
              fontSize: '12px',
              color: 'var(--ink-1)',
              fontWeight: '500'
            }}
          >
          <span style={{ marginRight: '6px' }}>
            {index + 1}/{images.length}
          </span>

          {images.map((_, dotIndex) => (
            <div
              key={dotIndex}
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(dotIndex)
              }}
              style={{
                width: dotIndex === index ? '12px' : '3px',
                height: '3px',
                borderRadius: '2px',
                background: dotIndex === index
                  ? 'var(--ink-1)'
                  : 'var(--ink-3)',
                cursor: 'pointer',
                transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none'
              }}
            />
          ))}
          </div>
        )
      })()}
    </div>
  )
}