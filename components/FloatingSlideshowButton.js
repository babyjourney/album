// NOTE: this component is not currently rendered anywhere. The active
// slideshow trigger lives on the ActionCluster dock in pages/dashboard.js
// (handleOpenSlideshow). It's kept here in case we want to re-enable a
// floating PLAY button later. The fetch logic mirrors handleOpenSlideshow
// so it respects the same filter state when wired up.

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

export default function FloatingSlideshowButton({
  familyId,
  filters = null,
  searchQuery = '',
  selectedChildId = null,
}) {
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)

  // Mirrors dashboard.js → handleOpenSlideshow so filters / search / child
  // selection all reach the API. Without this the slideshow would iterate
  // every post in the family album, which is exactly the bug Sergiu raised.
  const buildParams = () => {
    const params = new URLSearchParams({ familyId })
    if (searchQuery?.trim()) params.append('search', searchQuery.trim())
    if (filters) {
      if (filters.category && filters.category !== 'all') params.append('category', filters.category)
      if (filters.hashtag?.trim()) params.append('hashtag', filters.hashtag.trim())
      if (filters.date) {
        const d = new Date(filters.date)
        const start = new Date(d); start.setDate(start.getDate() - 5)
        const end   = new Date(d); end.setDate(end.getDate() + 5)
        params.append('dateStart', start.toISOString())
        params.append('dateEnd',   end.toISOString())
      }
      params.append('sort', filters.sort || 'newest')
    } else {
      params.append('sort', 'newest')
    }
    if (selectedChildId) params.append('childId', selectedChildId)
    return params
  }

  const fetchMemories = async () => {
    if (!familyId) return []
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/photos/list?${buildParams().toString()}`)
      const result = await response.json()
      if (response.ok && result.photos) {
        const media = result.photos.filter(p => p.type !== 'text' && (p.fileUrl || p.file_url))
        setMemories(media)
        return media
      }
      return []
    } catch (error) {
      console.error('Slideshow fetch error:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleSlideshowClick = async () => {
    const fetched = await fetchMemories()
    if (fetched && fetched.length > 0) setShowSlideshow(true)
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

      <MemorySlideshow
        isOpen={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        memories={memories}
      />
    </>
  )
}
