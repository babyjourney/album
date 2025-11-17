import { useState, useEffect, useRef, useCallback } from 'react'

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

  // Simple animation constants
  const SNAP_THRESHOLD = 0.3 // 30% of container width
  const VELOCITY_THRESHOLD = 0.5 // minimum velocity for quick swipe

  // Helper function to detect if URL is a video
  const isVideoUrl = (url) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext))
  }

  // Track viewport height changes for mobile browser UI
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

  // Update internal index and reset drag offset when prop changes
  useEffect(() => {
    if (currentIndex !== index) {
      setIndex(currentIndex)
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
      setDragOffset(-currentIndex * containerWidth)
    }
  }, [currentIndex, index])

  // Simple smooth animation to target index
  const animateToIndex = useCallback((targetIndex) => {
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const targetOffset = -targetIndex * containerWidth
    setDragOffset(targetOffset)
    setIsDragging(false)
  }, [])

  // Handle navigation with bounds checking
  const navigateToIndex = useCallback((newIndex) => {
    const clampedIndex = Math.max(0, Math.min(images.length - 1, newIndex))
    setIndex(clampedIndex)
    onIndexChange?.(clampedIndex)
    animateToIndex(clampedIndex)
  }, [images.length, onIndexChange, animateToIndex])

  // Touch event handlers optimized for mobile
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
    
    // Prevent default but allow event bubbling for better mobile responsiveness
    e.preventDefault()
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return
    
    const touch = e.touches[0]
    const currentTime = Date.now()
    const deltaTime = currentTime - lastTouchTime.current
    const deltaX = touch.clientX - lastTouchX.current
    
    // Calculate movement from start position
    const rawOffsetX = Math.abs(touch.clientX - startX)
    const rawOffsetY = Math.abs(touch.clientY - startY)
    
    // Enhanced gesture detection to prevent vertical scroll conflicts
    const horizontalGestureThreshold = 10 // Lower threshold for quicker detection
    const verticalScrollAllowance = 2.0 // More strict about horizontal gestures
    
    // Determine if this is a horizontal swipe gesture
    const isHorizontalGesture = rawOffsetX > horizontalGestureThreshold && 
                               rawOffsetX > rawOffsetY * verticalScrollAllowance
    
    // Aggressively prevent vertical scroll for horizontal gestures
    if (isHorizontalGesture) {
      e.preventDefault()
      e.stopPropagation()
      // Also prevent on parent elements
      const modalContainer = document.querySelector('.mobile-scroll-container')
      if (modalContainer) {
        modalContainer.style.touchAction = 'none'
      }
    }

    // Calculate velocity for momentum (improved for mobile)
    if (deltaTime > 0 && deltaTime < 100) { // Only calculate velocity for smooth movements
      setVelocityX(deltaX / deltaTime)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const rawOffset = touch.clientX - startX
    
    // Enhanced resistance calculation for better feel on mobile
    let offset = rawOffset
    const currentTargetOffset = -index * containerWidth

    // Apply resistance if dragging beyond boundaries (more responsive)
    if (index === 0 && offset > 0) {
      offset = offset * 0.3 // Slightly less resistance for better feel
    } else if (index === images.length - 1 && offset < 0) {
      offset = offset * 0.3 // Slightly less resistance for better feel
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

    // Enhanced mobile gesture recognition
    let newIndex = index
    
    // Mobile-optimized thresholds
    const mobileVelocityThreshold = 0.3 // Lower threshold for mobile
    const mobileSnapThreshold = 0.25 // Lower snap threshold (25% instead of 30%)
    
    // Use velocity for quick swipes (more sensitive on mobile)
    if (absVelocity > mobileVelocityThreshold) {
      if (velocityX < -mobileVelocityThreshold && index < images.length - 1) {
        newIndex = index + 1
      } else if (velocityX > mobileVelocityThreshold && index > 0) {
        newIndex = index - 1
      }
    }
    // Use distance for slow drags (more sensitive threshold)
    else if (Math.abs(deltaX) > containerWidth * mobileSnapThreshold) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    navigateToIndex(newIndex)
    
    // Re-enable touch action after gesture completes
    if (containerRef.current) {
      containerRef.current.style.touchAction = 'auto'
    }
    
    // Re-enable vertical scroll on modal container
    const modalContainer = document.querySelector('.mobile-scroll-container')
    if (modalContainer) {
      modalContainer.style.touchAction = 'pan-y'
    }
  }, [isDragging, dragOffset, index, startTime, velocityX, images.length, navigateToIndex])

  // Mouse events for desktop
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

    // Calculate velocity for momentum
    if (deltaTime > 0) {
      setVelocityX(deltaX / deltaTime)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const rawOffset = e.clientX - startX
    const currentTargetOffset = -index * containerWidth

    // Add resistance at boundaries (rubber band effect)
    let offset = rawOffset
    if (index === 0 && offset > 0) {
      offset = offset * 0.2 // More resistance when at first image
    } else if (index === images.length - 1 && offset < 0) {
      offset = offset * 0.2 // More resistance when at last image
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

    // Determine if we should change slides
    let newIndex = index
    
    // Use velocity for quick swipes/drags
    if (absVelocity > VELOCITY_THRESHOLD) {
      if (velocityX < -VELOCITY_THRESHOLD && index < images.length - 1) {
        newIndex = index + 1
      } else if (velocityX > VELOCITY_THRESHOLD && index > 0) {
        newIndex = index - 1
      }
    }
    // Use distance for slow drags
    else if (Math.abs(deltaX) > containerWidth * SNAP_THRESHOLD) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    navigateToIndex(newIndex)
  }, [isDragging, dragOffset, index, startTime, velocityX, images.length, navigateToIndex])

  // Add global mouse event listeners for desktop dragging
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

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Calculate transform with hardware acceleration
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
        // Enhanced mobile performance
        transform: 'translateZ(0)', // Force hardware acceleration
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
                controls
                playsInline
                preload="metadata"
                webkit-playsinline="true"
                crossOrigin="anonymous"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  // Clean simple appearance
                  ...(isDragging && imgIndex !== index && {
                    opacity: '0.9'
                  })
                }}
                onDragStart={(e) => e.preventDefault()}
                onError={(e) => {
                  console.error('Video failed to load:', url)
                  console.error('Video error event:', e)
                  // Show a fallback instead of hiding completely
                  e.target.style.background = 'var(--bg-gray)'
                  e.target.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary);">⚠️ Video încărcare eșuată</div>'
                }}
                onLoadStart={() => console.log('Video load started:', url)}
                onCanPlay={() => console.log('Video can play:', url)}
              >
                <source src={url} type="video/mp4" />
                <source src={url} type="video/quicktime" />
                <p>Browserul nu suportă redarea video-ului.</p>
              </video>
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
                  // Clean simple appearance
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

      {/* Navigation arrows for desktop */}
      {images.length > 1 && (
        <>
          {/* Previous arrow */}
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(index - 1)
              }}
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--overlay)',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--overlay)'
                e.target.style.transform = 'translateY(-50%) scale(1.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--overlay)'
                e.target.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              ←
            </button>
          )}
          
          {/* Next arrow */}
          {index < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(index + 1)
              }}
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--overlay)',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--overlay)'
                e.target.style.transform = 'translateY(-50%) scale(1.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--overlay)'
                e.target.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              →
            </button>
          )}
        </>
      )}

      {/* Modern minimalistic progress indicators */}
      {images.length > 1 && (() => {
        return (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)', // Center horizontally
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 30, // Higher z-index
            padding: '6px 12px',
            background: 'var(--overlay)', // Match post counter style
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            // Compact design for top positioning
            fontSize: '12px',
            color: 'white',
            fontWeight: '500'
          }}>
          {/* Photo count text */}
          <span style={{ marginRight: '6px' }}>
            {index + 1}/{images.length}
          </span>
          
          {/* Compact dots */}
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
                  ? 'rgba(255, 255, 255, 1)' 
                  : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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