import { useState, useEffect } from 'react'
import MemorySlideshow from './MemorySlideshow'
import { authenticatedFetch } from '../lib/pinAuth'

const slideshowAnimations = `
  @keyframes slideshow-pulse {
    0%, 100% {
      box-shadow:
        0 12px 32px -8px rgba(0, 0, 0, 0.30),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.30),
        0 0 0 0 rgba(124, 58, 237, 0.45);
    }
    50% {
      box-shadow:
        0 16px 40px -8px rgba(0, 0, 0, 0.32),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.30),
        0 0 0 10px rgba(124, 58, 237, 0);
    }
  }
  @keyframes slideshow-spin {
    to { transform: rotate(360deg); }
  }
`

if (typeof document !== 'undefined' && !document.getElementById('slideshow-button-animations')) {
  const styleEl = document.createElement('style')
  styleEl.id = 'slideshow-button-animations'
  styleEl.textContent = slideshowAnimations
  document.head.appendChild(styleEl)
}

export default function FloatingSlideshowButton({ familyId }) {
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchAllMemories = async () => {
    if (!familyId) {
      console.log('No familyId provided')
      return []
    }

    setLoading(true)
    try {
      console.log('Fetching memories for familyId:', familyId)
      const response = await authenticatedFetch(`/api/photos/list?familyId=${familyId}&sort=newest`)
      const result = await response.json()

      console.log('API Response:', response.ok, result)

      if (response.ok && result.photos) {
        console.log('Raw photos from API:', result.photos.length, result.photos)

        const mediaMemories = result.photos.filter(photo => {
          console.log('Checking photo:', {
            id: photo.id,
            type: photo.type,
            file_type: photo.file_type,
            fileUrl: photo.fileUrl,
            file_url: photo.file_url
          })

          const isNotTextPost = photo.type !== 'text'

          const hasFile = (photo.fileUrl && photo.fileUrl.trim() !== '') ||
                          (photo.file_url && photo.file_url.trim() !== '')

          const typeOK = !photo.type || photo.type !== 'text'

          const passes = typeOK && hasFile
          console.log('Photo passes filter:', passes, 'typeOK:', typeOK, 'hasFile:', hasFile)
          return passes
        })
        console.log('Filtered memories:', mediaMemories.length, mediaMemories)
        setMemories(mediaMemories)
        return mediaMemories
      }
      return []
    } catch (error) {
      console.error('Error fetching memories:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleSlideshowClick = async () => {
    console.log('SLIDESHOW: Button clicked - fetching real album photos/videos')
    const fetchedMemories = await fetchAllMemories()
    console.log('SLIDESHOW: Got memories:', fetchedMemories?.length, fetchedMemories)

    if (fetchedMemories && fetchedMemories.length > 0) {
      setShowSlideshow(true)
      console.log('SLIDESHOW: Opening slideshow with', fetchedMemories.length, 'memories')
    } else {
      console.log('SLIDESHOW: No photos/videos found in album - check API response above')
    }
  }

  return (
    <>
      <div
        className="slideshow-button-container"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 10
        }}
      >
        <button
          onClick={handleSlideshowClick}
          disabled={loading}
          className="floating-button"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            color: 'var(--ink-1)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
            position: 'relative',
            animation: loading ? 'none' : 'slideshow-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite'
          }}
        >
          {loading ? (
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid var(--glass-hairline-strong)',
              borderTop: '2px solid var(--accent-iris)',
              borderRadius: '50%',
              animation: 'slideshow-spin 1s linear infinite'
            }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
            </svg>
          )}
        </button>
      </div>

      {console.log('Rendering MemorySlideshow with:', { showSlideshow, memoriesCount: memories.length })}
      <MemorySlideshow
        isOpen={showSlideshow}
        onClose={() => {
          console.log('Slideshow close clicked')
          setShowSlideshow(false)
        }}
        memories={memories}
      />
    </>
  )
}
