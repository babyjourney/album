import { useState, useEffect } from 'react'
import MemorySlideshow from './MemorySlideshow'

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
      const response = await fetch(`/api/photos/list?familyId=${familyId}&sort=newest`)
      const result = await response.json()
      
      console.log('API Response:', response.ok, result)
      
      if (response.ok && result.photos) {
        console.log('Raw photos from API:', result.photos.length, result.photos)
        
        // Filter to get only photos and videos (not text posts)
        const mediaMemories = result.photos.filter(photo => {
          console.log('Checking photo:', {
            id: photo.id, 
            type: photo.type, 
            file_type: photo.file_type,
            fileUrl: photo.fileUrl,
            file_url: photo.file_url
          })
          
          // Check if it's NOT a text post
          const isNotTextPost = photo.type !== 'text'
          
          // Check if it has a file URL (could be fileUrl or file_url)
          const hasFile = (photo.fileUrl && photo.fileUrl.trim() !== '') || 
                          (photo.file_url && photo.file_url.trim() !== '')
          
          const passes = isNotTextPost && hasFile
          console.log('Photo passes filter:', passes, 'isNotTextPost:', isNotTextPost, 'hasFile:', hasFile)
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
      {/* Floating Slideshow Button */}
      <div
        className="slideshow-button-container"
        style={{
          position: 'fixed',
          bottom: '92px',
          right: '20px',
          zIndex: 100
        }}
      >
        <button
          onClick={handleSlideshowClick}
          disabled={loading}
          className="floating-button"
          style={{
            width: window.innerWidth <= 768 ? '48px' : '56px',
            height: window.innerWidth <= 768 ? '48px' : '56px',
            borderRadius: '50%',
            border: 'none',
            background: loading ? 
              'linear-gradient(135deg, #9ca3af, #6b7280)' :
              'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            fontSize: window.innerWidth <= 768 ? '20px' : '24px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: window.innerWidth <= 768 ? 
              '0 4px 12px rgba(59, 130, 246, 0.3)' : 
              '0 8px 25px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.transform = 'scale(1.1)'
              e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.6)'
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)'
            }
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.target.style.transform = 'scale(0.95)'
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.target.style.transform = 'scale(1.1)'
            }
          }}
        >
          {loading ? (
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            '🎞'
          )}
        </button>
      </div>

      {/* Memory Slideshow Modal */}
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