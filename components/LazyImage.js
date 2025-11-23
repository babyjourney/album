import { useState, useRef, useEffect } from 'react'

export default function LazyImage({ 
  src, 
  alt, 
  style, 
  className,
  onError,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNiAxMiA2UzE2IDcuNzkgMTYgMTBTMTQuMjEgMTIgMTIgMTJaTTEyIDhDMTAuOSA4IDEwIDguOSAxMCAxMFMxMC45IDEyIDEyIDEyUzE0IDExLjEgMTQgMTBTMTMuMSA4IDEyIDhaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0yMSAxOVYzSDNWMTlIMjFaTTIxIDFDMjIuMSAxIDIzIDEuOSAyMyAzVjE5QzIzIDIwLjEgMjIuMSAyMSAyMSAyMUgzQzEuOSAyMSAxIDIwLjEgMSAxOVYzQzEgMS45IDEuOSAxIDMgMUgyMVoiIGZpbGw9IiM5QjlCOUIiLz4KPC9zdmc+',
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Increased for earlier loading
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Preload images that are close to viewport
  useEffect(() => {
    if (isInView && src) {
      const img = new Image()
      img.src = src
    }
  }, [isInView, src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = (e) => {
    setHasError(true)
    if (onError) {
      onError(e)
    }
  }

  return (
    <div 
      ref={imgRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        ...style
      }}
      className={className}
    >
      {!isInView ? (
        // Placeholder while not in view
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#9b9b9b'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12C9.79 12 8 10.21 8 8S9.79 6 12 6S16 7.79 16 10S14.21 12 12 12ZM12 8C10.9 8 10 8.9 10 10S10.9 12 12 12S14 11.1 14 10S13.1 8 12 8Z"/>
            <path d="M21 19V3H3V19H21ZM21 1C22.1 1 23 1.9 23 3V19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V3C1 1.9 1.9 1 3 1H21Z"/>
          </svg>
        </div>
      ) : (
        <>
          {!isLoaded && !hasError && (
            // Loading animation
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div 
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
            </div>
          )}
          <img
            src={hasError ? placeholder : src}
            alt={alt}
            style={{
              ...style,
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}