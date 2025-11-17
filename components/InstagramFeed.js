import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'

// Helper function to detect and extract multi-photo URLs
const getMultiPhotoUrls = (post) => {
  // First check for proper file_urls field (new format)
  if (post.type === 'multi-photo' && post.file_urls) {
    // If file_urls is already an array, return it
    if (Array.isArray(post.file_urls)) {
      return post.file_urls
    }
    // If it's a string, try to parse it
    try {
      return JSON.parse(post.file_urls)
    } catch (e) {
      return null
    }
  }
  
  // Fallback to old format in description (for compatibility with existing posts)
  if (post.description && post.description.includes('__MULTI_PHOTO_URLS__:')) {
    try {
      const marker = '__MULTI_PHOTO_URLS__:'
      const markerIndex = post.description.indexOf(marker)
      const urlsJson = post.description.substring(markerIndex + marker.length)
      return JSON.parse(urlsJson)
    } catch (e) {
      return null
    }
  }
  
  return null
}

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

export default function InstagramFeed({ familyId, searchQuery, refreshTrigger, onPostClick, onPostCountUpdate, onHashtagClick, filters, selectedChildId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showError } = useToast()
  const { language } = useLanguage()

  useEffect(() => {
    fetchPosts()
  }, [familyId, refreshTrigger, searchQuery, filters, selectedChildId])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        familyId: familyId
      })

      // Add search query
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      // Add filters if they exist
      if (filters) {
        if (filters.category && filters.category !== 'all') {
          params.append('category', filters.category)
        }
        
        if (filters.hashtag && filters.hashtag.trim()) {
          params.append('hashtag', filters.hashtag.trim())
        }
        
        if (filters.date) {
          // Calculate 11-day window (5 days before and after)
          const filterDate = new Date(filters.date)
          const startDate = new Date(filterDate)
          startDate.setDate(startDate.getDate() - 5)
          const endDate = new Date(filterDate)
          endDate.setDate(endDate.getDate() + 5)
          
          params.append('dateStart', startDate.toISOString())
          params.append('dateEnd', endDate.toISOString())
        }
        
        if (filters.sort) {
          params.append('sort', filters.sort)
        }
      }

      // Add child filter
      if (selectedChildId) {
        params.append('childId', selectedChildId)
      }

      const response = await fetch(`/api/photos/list?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Încărcarea postărilor a eșuat')
      }

      const photosData = result.photos || []
      setPosts(photosData)
      
      // Update post count in parent
      if (onPostCountUpdate) {
        onPostCountUpdate(photosData.length)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      const errorMessage = 'Încărcarea postărilor a eșuat'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Posts are now filtered and sorted server-side, so we just use them directly
  const filteredPosts = posts

  const formatDate = (dateString) => {
    const locale = language === 'ru' ? 'ru-RU' : 'ro-RO'
    
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const renderPost = (post, index) => {
    const isTextPost = post.type === 'text'
    const isVideo = post.file_type === 'video' || post.type === 'video'
    
    return (
      <div
        key={post.id}
        className="instagram-card"
        style={{ 
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 2px 8px var(--shadow-light), 0 1px 3px var(--shadow-medium)',
          position: 'relative'
        }}
        onClick={() => onPostClick(post, filteredPosts, index)}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-medium), 0 4px 12px var(--shadow-light)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-light), 0 1px 3px var(--shadow-medium)'
        }}
      >
        {/* Full-screen Media */}
        <div style={{ width: '100%', position: 'relative' }}>
          {isTextPost ? (
            <div style={{
              width: '100%',
              aspectRatio: '1/1',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }}></div>
              <div style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: '280px'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginBottom: '16px',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                }}>💭</div>
                <p style={{ 
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  lineHeight: '1.4',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}>
                  {getCleanDescription(post) || 'Postare text'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ 
              aspectRatio: '1/1',
              overflow: 'hidden', 
              backgroundColor: '#F3F4F6',
              position: 'relative'
            }}>
              {isVideo ? (
                <>
                  <video
                    src={post.file_url}
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    controls={false}
                    preload="metadata"
                    muted
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '3px solid rgba(255, 255, 255, 0.9)'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)'
                  }}>
                    Video
                  </div>
                </>
              ) : (() => {
                const multiPhotoUrls = getMultiPhotoUrls(post)
                return multiPhotoUrls ? (
                  // Multi-photo post - show first image with dots indicator
                  <>
                    <div
                      className="smooth-scroll-container"
                      style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollSnapType: 'x mandatory',
                        scrollSnapStop: 'always',
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'auto',
                        gap: 0,
                        cursor: 'grab',
                        // Enhanced CSS for better momentum scrolling
                        transform: 'translateZ(0)', // Force hardware acceleration
                        willChange: 'scroll-position',
                        // Better momentum on iOS
                        '-webkit-overflow-scrolling': 'touch'
                      }}
                      onScroll={(e) => {
                        const container = e.target
                        const scrollLeft = container.scrollLeft
                        const imageWidth = container.clientWidth
                        const currentIndex = Math.round(scrollLeft / imageWidth)
                        
                        // Update dots indicator with smooth transitions
                        const dots = container.parentElement.querySelectorAll('.carousel-dot')
                        dots.forEach((dot, idx) => {
                          dot.style.backgroundColor = idx === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)'
                          dot.style.transform = idx === currentIndex ? 'scale(1.2)' : 'scale(1)'
                          dot.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        })
                      }}
                      onMouseDown={(e) => {
                        const container = e.currentTarget
                        container.style.cursor = 'grabbing'
                        container.dataset.isDown = 'true'
                        container.dataset.startX = e.pageX - container.offsetLeft
                        container.dataset.scrollLeft = container.scrollLeft
                      }}
                      onMouseLeave={(e) => {
                        const container = e.currentTarget
                        container.style.cursor = 'grab'
                        container.dataset.isDown = 'false'
                      }}
                      onMouseUp={(e) => {
                        const container = e.currentTarget
                        container.style.cursor = 'grab'
                        container.dataset.isDown = 'false'
                      }}
                      onMouseMove={(e) => {
                        const container = e.currentTarget
                        if (container.dataset.isDown !== 'true') return
                        e.preventDefault()
                        const x = e.pageX - container.offsetLeft
                        const walk = (x - parseFloat(container.dataset.startX)) * 2
                        container.scrollLeft = parseFloat(container.dataset.scrollLeft) - walk
                      }}
                    >
                      {multiPhotoUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`${post.title || 'Post'} - ${index + 1}`}
                          style={{ 
                            minWidth: '100%',
                            maxWidth: '100%',
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover',
                            scrollSnapAlign: 'center',
                            scrollSnapStop: 'always',
                            flexShrink: 0,
                            display: 'block',
                            boxSizing: 'border-box',
                            margin: 0,
                            padding: 0,
                            border: 'none',
                            // Enhanced image rendering
                            transform: 'translateZ(0)', // Hardware acceleration
                            willChange: 'transform',
                            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                            backfaceVisibility: 'hidden', // Prevent flicker
                            imageRendering: 'auto'
                          }}
                          loading="lazy"
                          onError={(e) => {
                            console.error('Image failed to load:', url)
                            e.target.style.display = 'none'
                          }}
                        />
                      ))}
                    </div>
                    {/* Instagram-style dots indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '6px',
                      zIndex: 2
                    }}>
                      {multiPhotoUrls.map((_, index) => (
                      <div
                        key={index}
                        className="carousel-dot"
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? 'white' : 'rgba(255, 255, 255, 0.5)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          transform: 'scale(1)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          const container = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                          if (container) {
                            const imageWidth = container.clientWidth
                            container.scrollTo({
                              left: index * imageWidth,
                              behavior: 'smooth'
                            })
                          }
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Desktop Navigation Arrows */}
                  {multiPhotoUrls.length > 1 && (
                    <>
                      {/* Previous Arrow */}
                      <button
                        className="carousel-nav-arrow carousel-nav-prev"
                        onClick={(e) => {
                          e.stopPropagation()
                          const container = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                          if (container) {
                            const imageWidth = container.clientWidth
                            const currentScroll = container.scrollLeft
                            const currentIndex = Math.round(currentScroll / imageWidth)
                            const prevIndex = Math.max(0, currentIndex - 1)
                            container.scrollTo({
                              left: prevIndex * imageWidth,
                              behavior: 'smooth'
                            })
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.3,
                          transition: 'opacity 0.2s ease',
                          zIndex: 3,
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        ←
                      </button>
                      
                      {/* Next Arrow */}
                      <button
                        className="carousel-nav-arrow carousel-nav-next"
                        onClick={(e) => {
                          e.stopPropagation()
                          const container = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                          if (container) {
                            const imageWidth = container.clientWidth
                            const currentScroll = container.scrollLeft
                            const currentIndex = Math.round(currentScroll / imageWidth)
                            const nextIndex = Math.min(multiPhotoUrls.length - 1, currentIndex + 1)
                            container.scrollTo({
                              left: nextIndex * imageWidth,
                              behavior: 'smooth'
                            })
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.3,
                          transition: 'opacity 0.2s ease',
                          zIndex: 3,
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        →
                      </button>
                    </>
                  )}
                  
                  {/* Multi-photo icon indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zM20 16H8V4h12v12zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>
                    </svg>
                    {multiPhotoUrls.length}
                  </div>
                </>
                ) : (
                  // Single image post
                  <img
                    src={post.file_url}
                    alt={post.title || 'Post'}
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', post.file_url)
                      e.target.style.display = 'none'
                    }}
                  />
                )
              })()}
            </div>
          )}
          
          {/* Category badge overlay */}
          {post.category && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'var(--overlay)',
              backdropFilter: 'blur(10px)',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              {post.category === 'memories' ? 'Amintiri' :
               post.category === 'milestones' ? 'Etape importante' :
               post.category === 'everyday' ? 'Zilnic' :
               post.category === 'special' ? 'Special' :
               post.category === 'family' ? 'Familie' :
               post.category === 'play' ? 'Joacă' :
               post.category === 'learning' ? 'Învățare' :
               post.category.charAt(0).toUpperCase() + post.category.slice(1)}
            </div>
          )}
        </div>

        {/* Compact Footer with all info */}
        <div style={{ 
          background: 'var(--bg-secondary)',
          padding: '12px',
          borderTop: '1px solid var(--border-light)',
          borderRadius: '0 0 24px 24px'
        }}>
          {post.title && (
            <h3 style={{ 
              fontWeight: '600', 
              marginBottom: '8px', 
              fontSize: '15px',
              color: 'var(--text-primary)',
              lineHeight: '1.2'
            }}>
              {post.title}
            </h3>
          )}
          
          {!isTextPost && getCleanDescription(post) && (
            <p style={{ 
              marginBottom: '12px', 
              fontSize: '14px', 
              lineHeight: '1.4',
              color: 'var(--text-primary)'
            }}>
              {getCleanDescription(post).length > 60 ? 
                getCleanDescription(post).substring(0, 60) + '...' : 
                getCleanDescription(post)
              }
            </p>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                {post.hashtags.slice(0, 2).map((hashtag, index) => (
                  <button 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      onHashtagClick && onHashtagClick(hashtag)
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-gray)',
                      color: 'var(--accent-blue)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      WebkitTapHighlightColor: 'transparent',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  >
                    {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                  </button>
                ))}
                {post.hashtags.length > 2 && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    padding: '4px'
                  }}>
                    +{post.hashtags.length - 2}
                  </span>
                )}
              </div>
            ) : <div></div>}
            
            {/* Date */}
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--text-secondary)',
              fontWeight: '500',
              marginLeft: '12px'
            }}>
              {formatDate(post.created_at)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="main-container">
        <div className="instagram-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              background: 'var(--bg-content)',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-light)'
            }}>
              {/* Header skeleton */}
              <div style={{ padding: '16px 16px 0 16px' }}>
                <div style={{
                  width: '80px',
                  height: '24px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></div>
              </div>
              {/* Image skeleton */}
              <div style={{ 
                aspectRatio: '1/1',
                backgroundColor: '#F3F4F6', 
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
              {/* Footer skeleton */}
              <div style={{ padding: '16px' }}>
                <div style={{
                  width: '60%',
                  height: '16px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></div>
                <div style={{
                  width: '40%',
                  height: '12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '4px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main-container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <p className="text-body">{error}</p>
        </div>
      </div>
    )
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="main-container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          {searchQuery ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h3 className="text-section-title" style={{ marginBottom: '8px' }}>Nu s-au găsit rezultate</h3>
              <p className="text-body">
                Nicio postare nu se potrivește cu căutarea pentru "{searchQuery}". Încercați cuvinte cheie sau etichete diferite.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
              <h3 className="text-section-title" style={{ marginBottom: '8px' }}>Împărtășiți prima amintire</h3>
              <p className="text-body">
                Creați amintiri frumoase de familie încărcând fotografii, video-uri sau împărtășind gândurile voastre.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      <div className="instagram-grid">
        {filteredPosts.map((post, index) => renderPost(post, index))}
      </div>
    </div>
  )
}