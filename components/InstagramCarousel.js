import { useState, useEffect, useRef, useCallback } from 'react'

export default function InstagramCarousel({ images, currentIndex = 0, onIndexChange, post }) {
  const [index, setIndex] = useState(currentIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [startX, setStartX] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [velocityX, setVelocityX] = useState(0)
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const lastTouchTime = useRef(0)
  const lastTouchX = useRef(0)

  // Physics constants for smooth animations
  const SNAP_THRESHOLD = 0.3 // 30% of container width
  const VELOCITY_THRESHOLD = 0.5 // minimum velocity for momentum
  const FRICTION = 0.85 // deceleration factor
  const SPRING_DAMPING = 0.8
  const SPRING_STIFFNESS = 0.3

  // Update internal index when prop changes
  useEffect(() => {
    setIndex(currentIndex)
  }, [currentIndex])

  // Smooth animation using RAF
  const animateToIndex = useCallback((targetIndex, initialVelocity = 0) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const targetOffset = -targetIndex * containerWidth
    let currentOffset = dragOffset
    let velocity = initialVelocity

    const animate = () => {
      const distance = targetOffset - currentOffset
      const springForce = distance * SPRING_STIFFNESS
      velocity = (velocity + springForce) * SPRING_DAMPING

      currentOffset += velocity

      setDragOffset(currentOffset)

      // Continue animation if we haven't reached the target
      if (Math.abs(distance) > 1 || Math.abs(velocity) > 0.1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDragOffset(targetOffset)
        setIsDragging(false)
      }
    }

    animate()
  }, [dragOffset])

  // Handle navigation with bounds checking
  const navigateToIndex = useCallback((newIndex, velocity = 0) => {
    const clampedIndex = Math.max(0, Math.min(images.length - 1, newIndex))
    setIndex(clampedIndex)
    onIndexChange?.(clampedIndex)
    animateToIndex(clampedIndex, velocity)
  }, [images.length, onIndexChange, animateToIndex])

  // Touch event handlers optimized for mobile
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setStartX(touch.clientX)
    setStartTime(Date.now())
    setVelocityX(0)
    lastTouchTime.current = Date.now()
    lastTouchX.current = touch.clientX

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    // Prevent default only for horizontal movements
    e.stopPropagation()
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const currentTime = Date.now()
    const deltaTime = currentTime - lastTouchTime.current
    const deltaX = touch.clientX - lastTouchX.current
    const deltaY = Math.abs(touch.clientY - e.touches[0].clientY)
    
    // Only prevent default if horizontal movement is dominant
    const rawOffsetX = Math.abs(touch.clientX - startX)
    if (rawOffsetX > 10) {
      e.preventDefault()
    }

    // Calculate velocity for momentum
    if (deltaTime > 0) {
      setVelocityX(deltaX / deltaTime)
    }

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const rawOffset = touch.clientX - startX
    
    // Add resistance at boundaries (rubber band effect)
    let offset = rawOffset
    const currentTargetOffset = -index * containerWidth

    // Apply resistance if dragging beyond boundaries
    if (index === 0 && offset > 0) {
      offset = offset * 0.2 // More resistance when at first image
    } else if (index === images.length - 1 && offset < 0) {
      offset = offset * 0.2 // More resistance when at last image
    }

    setDragOffset(currentTargetOffset + offset)
    lastTouchTime.current = currentTime
    lastTouchX.current = touch.clientX
  }, [isDragging, startX, index, images.length])

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging) return
    
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const deltaX = dragOffset + (index * containerWidth)
    const deltaTime = Date.now() - startTime
    const absVelocity = Math.abs(velocityX)

    setIsDragging(false)

    // Determine if we should change slides
    let newIndex = index
    
    // Use velocity for quick swipes (more sensitive on mobile)
    if (absVelocity > 0.3) {
      if (velocityX < -0.3 && index < images.length - 1) {
        newIndex = index + 1
      } else if (velocityX > 0.3 && index > 0) {
        newIndex = index - 1
      }
    }
    // Use distance for slow drags (lower threshold)
    else if (Math.abs(deltaX) > containerWidth * 0.2) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    // Apply momentum for smooth deceleration
    const momentum = velocityX * 50 // Reduced momentum for mobile
    navigateToIndex(newIndex, momentum)
  }, [isDragging, dragOffset, index, startTime, velocityX, images.length, navigateToIndex])

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setStartTime(Date.now())
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const offset = e.clientX - startX
    const currentTargetOffset = -index * containerWidth

    setDragOffset(currentTargetOffset + offset)
  }, [isDragging, startX, index])

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const deltaX = dragOffset + (index * containerWidth)

    setIsDragging(false)

    let newIndex = index
    if (Math.abs(deltaX) > containerWidth * SNAP_THRESHOLD) {
      if (deltaX < 0 && index < images.length - 1) {
        newIndex = index + 1
      } else if (deltaX > 0 && index > 0) {
        newIndex = index - 1
      }
    }

    navigateToIndex(newIndex)
  }, [isDragging, dragOffset, index, images.length, navigateToIndex])

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
        touchAction: 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        style={{
          display: 'flex',
          width: `${images.length * 100}%`,
          height: '100%',
          transform,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
            <img
              src={url}
              alt={`${post?.title || 'Post'} - ${imgIndex + 1}/${images.length}`}
              style={{ 
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                // Subtle parallax effect during drag
                ...(isDragging && imgIndex !== index && {
                  filter: 'brightness(0.8)',
                  transform: 'translateZ(0) scale(0.95)'
                })
              }}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        ))}
      </div>

      {/* Modern minimalistic progress indicators */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 20,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)'
        }}>
          {images.map((_, dotIndex) => (
            <div
              key={dotIndex}
              onClick={(e) => {
                e.stopPropagation()
                navigateToIndex(dotIndex)
              }}
              style={{
                width: dotIndex === index ? '16px' : '4px',
                height: '4px',
                borderRadius: '2px',
                background: dotIndex === index 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}