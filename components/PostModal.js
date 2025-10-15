import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import InstagramCarousel from './InstagramCarousel'

// Helper function to get multi-photo URLs
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

// Helper function to truncate description for Instagram-style "see more"
const getTruncatedDescription = (description, isExpanded) => {
  const MAX_LENGTH = 100 // Maximum characters to show before "see more"
  
  if (!description || description.length <= MAX_LENGTH) {
    return { text: description, needsTruncation: false }
  }
  
  if (isExpanded) {
    return { text: description, needsTruncation: true }
  }
  
  // Find the last space before the character limit to avoid cutting words
  const truncatePoint = description.lastIndexOf(' ', MAX_LENGTH)
  const truncatedText = truncatePoint > 0 ? description.substring(0, truncatePoint) : description.substring(0, MAX_LENGTH)
  
  return { text: truncatedText, needsTruncation: true }
}

// Mobile 3-dot menu component
function MobileActionMenu({ currentPost, isTextPost, onDownload, onDelete, onEdit, isDescriptionExpanded }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useOnClickOutside(menuRef, () => setShowMenu(false))

  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: isDescriptionExpanded ? '200px' : '40px',
        right: '16px',
        zIndex: 30,
        transition: 'bottom 0.3s ease'
      }}
    >
      {/* Menu items */}
      {showMenu && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          minWidth: '160px',
          animation: 'slideUpFloat 0.2s ease-out'
        }}>
          {!isTextPost && currentPost.file_url && (
            <button
              onClick={() => {
                onDownload()
                setShowMenu(false)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(0, 149, 246, 0.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Descarcă
            </button>
          )}
          
          {/* Edit button */}
          <button
            onClick={() => {
              onEdit()
              setShowMenu(false)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(156, 163, 175, 0.1)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 2 2L13 12l-4 1 1-4 7.5-7.5z"/>
            </svg>
            Editează
          </button>
          
          <button
            onClick={() => {
              onDelete()
              setShowMenu(false)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(220, 38, 38, 0.1)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Șterge
          </button>
        </div>
      )}
      
      {/* 3-dot menu button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          padding: '8px',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          color: 'white',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: showMenu ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'all 0.2s ease'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="5" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
    </div>
  )
}

export default function PostModal({ 
  selectedPost, 
  allPosts, 
  currentIndex, 
  onClose, 
  onDelete,
  onNavigate,
  onHashtagClick,
  readOnly = false 
}) {
  const [currentPost, setCurrentPost] = useState(selectedPost)
  const [currentIdx, setCurrentIdx] = useState(currentIndex)
  const [isMobile, setIsMobile] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editHashtags, setEditHashtags] = useState([])
  const [editHashtagInput, setEditHashtagInput] = useState('')
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)
  const { showSuccess, showError } = useToast()
  const modalRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  // Handle click on overlay to close modal
  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay, not on any child elements
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Edit functionality
  const handleEdit = () => {
    setEditTitle(currentPost.title || '')
    setEditDescription(getCleanDescription(currentPost) || '')
    
    // Handle hashtags safely - they could be string, array, or null/undefined
    let hashtagsArray = []
    if (currentPost.hashtags) {
      if (typeof currentPost.hashtags === 'string') {
        // String format: "#tag1 #tag2 #tag3"
        hashtagsArray = currentPost.hashtags
          .split(' ')
          .filter(tag => tag.startsWith('#'))
          .map(tag => tag.slice(1))
      } else if (Array.isArray(currentPost.hashtags)) {
        // Array format: ["tag1", "tag2", "tag3"] or ["#tag1", "#tag2", "#tag3"]
        hashtagsArray = currentPost.hashtags.map(tag => 
          typeof tag === 'string' ? (tag.startsWith('#') ? tag.slice(1) : tag) : ''
        ).filter(tag => tag.length > 0)
      }
    }
    
    setEditHashtags(hashtagsArray)
    setEditHashtagInput('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    try {
      const response = await fetch('/api/posts/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: currentPost.id,
          title: editTitle,
          description: editDescription,
          hashtags: editHashtags.map(tag => `#${tag}`).join(' ')
        })
      })

      if (response.ok) {
        const updatedPost = { 
          ...currentPost, 
          title: editTitle,
          description: editDescription,
          hashtags: editHashtags.map(tag => `#${tag}`).join(' ')
        }
        setCurrentPost(updatedPost)
        setShowEditModal(false)
        showSuccess('Postarea a fost actualizată cu succes!')
      } else {
        throw new Error('Failed to update post')
      }
    } catch (error) {
      showError('Eroare la actualizarea postării. Încercați din nou.')
    } finally {
      setEditLoading(false)
    }
  }

  // Handle hashtag input
  const handleHashtagKeyDown = (e) => {
    if (e.key === ' ' && editHashtagInput.trim()) {
      e.preventDefault()
      const newTag = editHashtagInput.trim().toLowerCase()
      if (!editHashtags.includes(newTag)) {
        setEditHashtags([...editHashtags, newTag])
      }
      setEditHashtagInput('')
    } else if (e.key === 'Backspace' && !editHashtagInput && editHashtags.length > 0) {
      setEditHashtags(editHashtags.slice(0, -1))
    }
  }

  const removeHashtag = (tagToRemove) => {
    setEditHashtags(editHashtags.filter(tag => tag !== tagToRemove))
  }

  // Enhanced scroll handler with centering logic
  const handleScroll = useCallback((e) => {
    if (isInitializing) return
    
    const scrollTop = e.target.scrollTop
    const postHeight = window.innerHeight
    const scrollIndex = Math.round(scrollTop / postHeight)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Debounced centering and post tracking
    scrollTimeoutRef.current = setTimeout(() => {
      const targetScrollTop = scrollIndex * postHeight
      const scrollDiff = Math.abs(scrollTop - targetScrollTop)
      
      // Auto-center if off by more than 10px
      if (scrollDiff > 10) {
        e.target.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
      }
      
      // Update current post
      if (scrollIndex !== currentIdx && scrollIndex >= 0 && scrollIndex < allPosts.length) {
        setCurrentIdx(scrollIndex)
        setCurrentPost(allPosts[scrollIndex])
        setCurrentImageIndex(0)
        if (onNavigate) onNavigate(allPosts[scrollIndex], scrollIndex)
      }
    }, 100)
  }, [isInitializing, currentIdx, allPosts, onNavigate])

  useEffect(() => {
    setCurrentPost(selectedPost)
    setCurrentIdx(currentIndex)
    setCurrentImageIndex(0) // Reset image index when post changes
    setIsDescriptionExpanded(false) // Reset description expansion when changing posts
    
    // Scroll to correct position immediately
    if (isMobile) {
      setIsInitializing(true)
      // Use multiple frames to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('.mobile-scroll-container')
          if (scrollContainer) {
            const targetTop = currentIndex * window.innerHeight
            scrollContainer.style.scrollBehavior = 'auto'
            scrollContainer.scrollTop = targetTop
            // Re-enable smooth scrolling
            setTimeout(() => {
              scrollContainer.style.scrollBehavior = 'smooth'
              setIsInitializing(false)
            }, 50)
          } else {
            setIsInitializing(false)
          }
        })
      })
    } else {
      setIsInitializing(false)
    }
  }, [selectedPost, currentIndex, isMobile])

  useEffect(() => {
    const handleKeyPress = (e) => {
      const multiPhotoUrls = getCurrentMultiPhotoUrls()
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        // Check if this is a multi-photo post and we can navigate images
        if (multiPhotoUrls && multiPhotoUrls.length > 1 && currentImageIndex > 0) {
          e.preventDefault()
          navigateToImage('prev')
        } else if (currentIdx > 0) {
          // Navigate to previous post
          navigateToPost(currentIdx - 1)
        }
      } else if (e.key === 'ArrowRight') {
        // Check if this is a multi-photo post and we can navigate images
        if (multiPhotoUrls && multiPhotoUrls.length > 1 && currentImageIndex < multiPhotoUrls.length - 1) {
          e.preventDefault()
          navigateToImage('next')
        } else if (currentIdx < allPosts.length - 1) {
          // Navigate to next post
          navigateToPost(currentIdx + 1)
        }
      }
    }
    
    // Prevent body scrolling when modal is open
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    const originalWidth = document.body.style.width
    
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.addEventListener('keydown', handleKeyPress)
    
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.width = originalWidth
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [currentIdx, allPosts, onNavigate, onClose])


  // Navigation helper function
  const navigateToPost = (newIndex) => {
    if (newIndex >= 0 && newIndex < allPosts.length) {
      const newPost = allPosts[newIndex]
      setCurrentPost(newPost)
      setCurrentIdx(newIndex)
      setCurrentImageIndex(0) // Reset image index when changing posts
      if (onNavigate) onNavigate(newPost, newIndex)
    }
  }

  // Multi-photo navigation functions
  const getCurrentMultiPhotoUrls = () => {
    return getMultiPhotoUrls(currentPost)
  }

  const navigateToImage = (direction) => {
    const multiPhotoUrls = getCurrentMultiPhotoUrls()
    if (!multiPhotoUrls || multiPhotoUrls.length <= 1) return

    let newIndex = currentImageIndex
    if (direction === 'next' && currentImageIndex < multiPhotoUrls.length - 1) {
      newIndex = currentImageIndex + 1
    } else if (direction === 'prev' && currentImageIndex > 0) {
      newIndex = currentImageIndex - 1
    }
    
    setCurrentImageIndex(newIndex)
    
    // Add smooth scroll animation
    const multiPhotoContainer = document.querySelector('.multi-photo-container')
    if (multiPhotoContainer) {
      const imageWidth = multiPhotoContainer.offsetWidth
      multiPhotoContainer.scrollTo({
        left: newIndex * imageWidth,
        behavior: 'smooth'
      })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Sunteți sigur că doriți să ștergeți această postare?')) {
      return
    }

    try {
      const response = await fetch('/api/photos/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId: currentPost.id,
          fileUrl: currentPost.file_url
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ștergerea postării a eșuat')
      }

      showSuccess('Postarea a fost ștearsă cu succes!')
      
      if (onDelete) {
        onDelete(currentPost.id)
      }
      
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
      showError('Ștergerea postării a eșuat')
    }
  }

  const handleDownload = async () => {
    if (!currentPost.file_url || currentPost.type === 'text') {
      showError('Această postare nu poate fi descărcată')
      return
    }

    try {
      const response = await fetch(currentPost.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const fileName = currentPost.title ? 
        `${currentPost.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(currentPost.created_at).toISOString().split('T')[0]}` :
        `download_${new Date(currentPost.created_at).toISOString().split('T')[0]}`
      
      const fileType = currentPost.file_type || 'image'
      const extension = fileType === 'video' ? '.mp4' : '.jpg'
      
      link.download = fileName + extension
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showSuccess('Descărcarea a început!')
    } catch (error) {
      console.error('Download failed:', error)
      showError('Descărcarea a eșuat. Încercați din nou.')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!currentPost) return null

  const isTextPost = currentPost.type === 'text'
  const isVideo = currentPost.file_type === 'video' || currentPost.type === 'video'

  // Mobile: Instagram-style vertical scroll
  if (isMobile) {
    return (
      <div 
        style={{ 
          zIndex: 1000,
          background: '#000',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          margin: 0,
          padding: 0
        }}
      >
        <div 
          ref={modalRef}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button only on mobile */}
        <button
          onClick={onClose}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 30,
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Post counter */}
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 30,
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          backdropFilter: 'blur(10px)'
        }}>
          {currentIdx + 1} / {allPosts.length}
        </div>

        {/* Fixed scroll container with enhanced centering */}
        <div 
          className="mobile-scroll-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 10,
            // Enhanced scroll snap for perfect centering
            scrollSnapType: 'y mandatory',
            scrollSnapStop: 'always',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // Force precise alignment
            scrollPadding: '0px',
            scrollMargin: '0px',
            // Prevent scroll during horizontal swipes
            touchAction: 'pan-y'
          }}
          onScroll={handleScroll}
        >
          {allPosts.map((post, index) => {
            const postIsText = post.type === 'text'
            const postIsVideo = post.file_type === 'video' || post.type === 'video'
            
            return (
              <div
                key={post.id}
                style={{
                  width: '100vw',
                  height: '100vh',
                  minHeight: '100vh',
                  maxHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: '#000',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always'
                }}
              >
                {postIsText ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '40px', 
                        marginBottom: '24px',
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                      }}>💭</div>
                      <p style={{ 
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '500',
                        lineHeight: '1.5',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        maxWidth: '400px'
                      }}>
                        {getCleanDescription(post) || 'Postare text'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxSizing: 'border-box'
                  }}>
                    {(() => {
                      const multiPhotoUrls = getMultiPhotoUrls(post)
                      
                      if (multiPhotoUrls && multiPhotoUrls.length > 1) {
                        // Multi-photo post - Instagram-style carousel
                        return (
                          <InstagramCarousel 
                            images={multiPhotoUrls}
                            currentIndex={index === currentIdx ? currentImageIndex : 0}
                            onIndexChange={(newIndex) => {
                              if (index === currentIdx) {
                                setCurrentImageIndex(newIndex)
                              }
                            }}
                            post={post}
                          />)
                      } else {
                        // Single image/video post or non-current multi-photo (show first image)
                        return postIsVideo ? (
                          <video
                            src={post.file_url}
                            controls
                            autoPlay={index === currentIdx}
                            style={{ 
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                        ) : (
                          <img
                            src={post.file_url}
                            alt={post.title || 'Post'}
                            style={{ 
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                        )
                      }
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile action menu - only show if not readonly */}
        {!readOnly && (
          <MobileActionMenu 
            currentPost={currentPost}
            isTextPost={isTextPost}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDescriptionExpanded={isDescriptionExpanded}
          />
        )}

        {/* Bottom info bar - only for current post */}
        {(currentPost.title || getCleanDescription(currentPost) || (currentPost.hashtags && currentPost.hashtags.length > 0)) && (
          <div style={{
            position: 'fixed',
            bottom: '-10px',
            left: '0',
            right: '0',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 60%, transparent 100%)',
            color: 'white',
            padding: isDescriptionExpanded ? '18px 16px 20px' : '10px 16px 20px',
            maxHeight: isDescriptionExpanded ? '60vh' : '120px',
            overflow: isDescriptionExpanded ? 'visible' : 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isDescriptionExpanded ? 'translateY(0)' : 'translateY(0)',
            zIndex: 15
          }}>
            {currentPost.title && (
              <h3 style={{ 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px',
                color: 'rgba(255, 255, 255, 0.95)', 
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isDescriptionExpanded ? 'normal' : 'nowrap'
              }}>
                {currentPost.title}
              </h3>
            )}
            
            {getCleanDescription(currentPost) && !isTextPost && (() => {
              const { text, needsTruncation } = getTruncatedDescription(getCleanDescription(currentPost), isDescriptionExpanded)
              return (
                <div style={{ marginBottom: isDescriptionExpanded ? '8px' : '4px' }}>
                  <p style={{
                    fontSize: '12px',
                    lineHeight: isDescriptionExpanded ? '1.4' : '1.3',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: needsTruncation ? '3px' : '0',
                    overflow: 'hidden',
                    display: isDescriptionExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isDescriptionExpanded ? 'none' : 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {text}
                    {needsTruncation && !isDescriptionExpanded && '...'}
                  </p>
                  {needsTruncation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsDescriptionExpanded(!isDescriptionExpanded)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 0',
                        textDecoration: 'none',
                        fontWeight: '400'
                      }}
                    >
                      {isDescriptionExpanded ? 'see less' : 'see more'}
                    </button>
                  )}
                </div>
              )
            })()}
            
            {currentPost.hashtags && currentPost.hashtags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {(isDescriptionExpanded ? currentPost.hashtags : currentPost.hashtags.slice(0, 3)).map((hashtag, index) => (
                  <button 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      onHashtagClick && onHashtagClick(hashtag)
                      onClose()
                    }}
                    style={{
                      padding: '1px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '400',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: 'rgba(255, 255, 255, 0.2)',
                      lineHeight: '2',
                      height: 'auto',
                      minHeight: 'unset',
                      display: 'inline-block',
                      verticalAlign: 'baseline'
                    }}
                    onTouchStart={(e) => {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.transform = 'scale(0.95)'
                    }}
                    onTouchEnd={(e) => {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.transform = 'scale(1)'
                    }}
                  >
                    #{hashtag}
                  </button>
                ))}
                {!isDescriptionExpanded && currentPost.hashtags.length > 3 && (
                  <span style={{
                    padding: '4px 10px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    +{currentPost.hashtags.length - 3} more
                  </span>
                )}
              </div>
            )}
            
            {isDescriptionExpanded && (
              <div style={{ 
                fontSize: '9px', // Very small
                color: 'rgba(255, 255, 255, 0.4)', // Very transparent
                marginTop: '2px',
                textAlign: 'center'
              }}>
                {formatDate(currentPost.created_at)}
              </div>
            )}
          </div>
        )}

        {/* Mobile Edit Modal */}
        {showEditModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Editează postarea
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Titlu
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Adaugă un titlu..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Descriere
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Adaugă o descriere..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Etichete
                </label>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '8px',
                  minHeight: '40px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {editHashtags.map((tag, index) => (
                    <span key={index} style={{
                      background: 'var(--accent-blue)',
                      color: 'white',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '400',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      lineHeight: '1',
                      height: 'auto',
                      minHeight: 'unset'
                    }}>
                      #{tag}
                      <button
                        onClick={() => removeHashtag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  
                  <input
                    type="text"
                    value={editHashtagInput}
                    onChange={(e) => setEditHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder={editHashtags.length === 0 ? "Tastează o etichetă și apasă spațiu..." : ""}
                    style={{
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: '120px',
                      padding: '4px 0',
                      fontSize: '14px',
                      backgroundColor: 'transparent'
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                  />
                </div>
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                  Tastează un cuvânt și apasă spațiu pentru a crea o etichetă
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Anulează
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'var(--accent-blue)',
                    color: 'white',
                    cursor: 'pointer',
                    opacity: editLoading ? 0.6 : 1
                  }}
                >
                  {editLoading ? 'Salvez...' : 'Salvează'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }

  // Desktop: Modern layout with padding
  return (
    <div 
      className="modal-overlay animate-fade-in" 
      onClick={handleOverlayClick}
      style={{ 
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.95)',
        padding: '20px'
      }}
    >
      {/* Desktop navigation arrows */}
      {currentIdx > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigateToPost(currentIdx - 1)
          }}
          style={{
            position: 'absolute',
            left: '36px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1002,
            padding: '12px',
            background: 'white',
            border: '1px solid var(--border-light)',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      )}
      
      {currentIdx < allPosts.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigateToPost(currentIdx + 1)
          }}
          style={{
            position: 'absolute',
            right: '36px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1002,
            padding: '12px',
            background: 'white',
            border: '1px solid var(--border-light)',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            transition: 'all 0.2s ease-in-out',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      )}

      {/* Action buttons in top right */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 1002,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Download button */}
        {!isTextPost && currentPost.file_url && (
          <button
            onClick={handleDownload}
            style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            title="Descarcă"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </button>
        )}
        
        {/* Edit button */}
        {!readOnly && (
          <button
            onClick={handleEdit}
            style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            title="Editează"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 2 2L13 12l-4 1 1-4 7.5-7.5z"/>
            </svg>
          </button>
        )}
        
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            padding: '14px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'white',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      {/* Post counter */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        zIndex: 1002,
        padding: '10px 16px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        {currentIdx + 1} / {allPosts.length}
      </div>

      {/* Desktop modal content - Contained approach */}
      <div 
        ref={modalRef} 
        style={{ 
          display: 'flex',
          width: 'calc(100vw - 40px)',
          height: 'calc(100vh - 40px)',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Section - Contained with space for sidebar */}
        <div style={{
          flex: isTextPost ? '1' : '0 0 75%',
          background: isTextPost ? 'transparent' : '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {isTextPost ? (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 40px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '24px',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                }}>💭</div>
                <p style={{ 
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  maxWidth: '400px'
                }}>
                  {getCleanDescription(currentPost) || 'Postare text'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              {(() => {
                const multiPhotoUrls = getCurrentMultiPhotoUrls()
                
                if (multiPhotoUrls && multiPhotoUrls.length > 1) {
                  // Multi-photo post - modern horizontal scroll container with dots
                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <div 
                        className="multi-photo-container smooth-scroll-container"
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
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          scrollSnapType: 'x mandatory',
                          scrollBehavior: 'smooth',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          WebkitOverflowScrolling: 'touch',
                          cursor: 'grab',
                          // Enhanced CSS for better momentum scrolling
                          transform: 'translateZ(0)', // Force hardware acceleration
                          willChange: 'scroll-position',
                          // Improved scroll snap properties
                          scrollSnapStop: 'always',
                          // Better momentum on iOS
                          '-webkit-overflow-scrolling': 'touch',
                          // Smooth transitions for scroll position
                          transition: 'scroll-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        }}
                        onScroll={(e) => {
                          const container = e.target
                          const scrollLeft = container.scrollLeft
                          const imageWidth = container.offsetWidth
                          const newIndex = Math.round(scrollLeft / imageWidth)
                          
                          if (newIndex !== currentImageIndex) {
                            setCurrentImageIndex(newIndex)
                          }
                        }}
                        ref={(ref) => {
                          if (ref) {
                            const imageWidth = ref.offsetWidth
                            ref.scrollTo({
                              left: currentImageIndex * imageWidth,
                              behavior: 'smooth'
                            })
                          }
                        }}
                      >
                        {multiPhotoUrls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`${currentPost.title || 'Post'} - ${index + 1}/${multiPhotoUrls.length}`}
                            style={{ 
                              minWidth: '100%',
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              scrollSnapAlign: 'start',
                              // Enhanced image rendering
                              transform: 'translateZ(0)', // Hardware acceleration
                              willChange: 'transform',
                              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                              backfaceVisibility: 'hidden', // Prevent flicker
                              imageRendering: 'auto'
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Desktop Navigation Arrows */}
                      {multiPhotoUrls.length > 1 && (
                        <>
                          {/* Previous Arrow */}
                          <button
                            className="modal-carousel-nav-arrow modal-carousel-nav-prev"
                            onClick={(e) => {
                              e.stopPropagation()
                              const container = e.target.parentElement.parentElement.querySelector('.multi-photo-container')
                              console.log('Previous arrow clicked, container:', container)
                              if (container) {
                                const imageWidth = container.clientWidth
                                const currentScroll = container.scrollLeft
                                const currentIndex = Math.round(currentScroll / imageWidth)
                                const prevIndex = Math.max(0, currentIndex - 1)
                                console.log('Scrolling from', currentIndex, 'to', prevIndex)
                                container.scrollTo({
                                  left: prevIndex * imageWidth,
                                  behavior: 'smooth'
                                })
                              }
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '60px',
                              left: '20px',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'rgba(0, 0, 0, 0.6)',
                              border: 'none',
                              color: 'white',
                              fontSize: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.7,
                              transition: 'opacity 0.2s ease, transform 0.2s ease',
                              zIndex: 30,
                              backdropFilter: 'blur(10px)'
                            }}
                          >
                            ←
                          </button>
                          
                          {/* Next Arrow */}
                          <button
                            className="modal-carousel-nav-arrow modal-carousel-nav-next"
                            onClick={(e) => {
                              e.stopPropagation()
                              const container = e.target.parentElement.parentElement.querySelector('.multi-photo-container')
                              console.log('Next arrow clicked, container:', container)
                              if (container) {
                                const imageWidth = container.clientWidth
                                const currentScroll = container.scrollLeft
                                const currentIndex = Math.round(currentScroll / imageWidth)
                                const nextIndex = Math.min(multiPhotoUrls.length - 1, currentIndex + 1)
                                console.log('Scrolling from', currentIndex, 'to', nextIndex)
                                container.scrollTo({
                                  left: nextIndex * imageWidth,
                                  behavior: 'smooth'
                                })
                              }
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '60px',
                              right: '20px',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'rgba(0, 0, 0, 0.6)',
                              border: 'none',
                              color: 'white',
                              fontSize: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.7,
                              transition: 'opacity 0.2s ease, transform 0.2s ease',
                              zIndex: 30,
                              backdropFilter: 'blur(10px)'
                            }}
                          >
                            →
                          </button>
                        </>
                      )}
                      
                      {/* Modern dots indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 25,
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '10px 16px',
                        borderRadius: '25px',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {multiPhotoUrls.map((_, index) => (
                            <div
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentImageIndex(index)
                              }}
                              style={{
                                width: index === currentImageIndex ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                backgroundColor: index === currentImageIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: index === currentImageIndex 
                                  ? '0 0 0 2px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4)' 
                                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
                                transform: index === currentImageIndex ? 'scale(1.1)' : 'scale(1)',
                              }}
                            />
                          ))}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: '500',
                          marginTop: '2px'
                        }}>
                          {currentImageIndex + 1} / {multiPhotoUrls.length}
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  // Single image/video post
                  return isVideo ? (
                    <video
                      src={currentPost.file_url}
                      controls
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <img
                      src={currentPost.file_url}
                      alt={currentPost.title || 'Post'}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 'calc(100vh - 40px)',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  )
                }
              })()}
            </div>
          )}
        </div>

        {/* Info Section - Compact sidebar */}
        <div style={{
          width: '400px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Header - More compact */}
          <div style={{ 
            padding: '24px 20px 16px 20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ flex: '1', marginRight: '16px' }}>
                <h2 style={{ 
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                  lineHeight: '1.3',
                  wordBreak: 'break-word'
                }}>
                  {currentPost.title || 'Postare'}
                </h2>
                <p style={{ 
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '0',
                  fontWeight: '500'
                }}>
                  {formatDate(currentPost.created_at)}
                </p>
              </div>
            </div>

            {/* Category - Moved to header for better space usage */}
            {currentPost.category && (
              <div style={{ marginBottom: '0' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {currentPost.category === 'memories' ? 'Amintiri' :
                   currentPost.category === 'milestones' ? 'Etape importante' :
                   currentPost.category === 'everyday' ? 'Zilnic' :
                   currentPost.category === 'special' ? 'Special' :
                   currentPost.category === 'family' ? 'Familie' :
                   currentPost.category === 'play' ? 'Joacă' :
                   currentPost.category === 'learning' ? 'Învățare' :
                   currentPost.category.charAt(0).toUpperCase() + currentPost.category.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Content - Optimized spacing */}
          <div style={{ 
            padding: '16px 20px',
            flex: '1',
            overflow: 'auto'
          }}>
            {/* Description */}
            {getCleanDescription(currentPost) && !isTextPost && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Descriere
                </h4>
                <p style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  margin: '0',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  borderLeft: '3px solid var(--accent-blue)'
                }}>
                  {getCleanDescription(currentPost)}
                </p>
              </div>
            )}

            {/* Hashtags - More compact */}
            {currentPost.hashtags && currentPost.hashtags.length > 0 && (
              <div style={{ marginBottom: '0' }}>
                <h4 style={{ 
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Tags ({currentPost.hashtags.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentPost.hashtags.map((hashtag, index) => (
                    <button 
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation()
                        onHashtagClick && onHashtagClick(hashtag)
                        onClose()
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'rgba(0, 149, 246, 0.1)',
                        color: 'var(--accent-blue)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid rgba(0, 149, 246, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = 'var(--accent-blue)'
                        e.target.style.color = 'white'
                        e.target.style.transform = 'translateY(-1px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'rgba(0, 149, 246, 0.1)'
                        e.target.style.color = 'var(--accent-blue)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      #{hashtag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1003,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              color: 'var(--text-primary)'
            }}>
              Editează postarea
            </h3>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Descriere
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                placeholder="Descrierea postării..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
              />
            </div>

            {/* Hashtags */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Etichete
              </label>
              <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px',
                minHeight: '40px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center'
              }}>
                {editHashtags.map((tag, index) => (
                  <span key={index} style={{
                    background: 'var(--accent-blue)',
                    color: 'white',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '400',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    lineHeight: '1',
                    height: 'auto',
                    minHeight: 'unset'
                  }}>
                    #{tag}
                    <button
                      onClick={() => setEditHashtags(editHashtags.filter((_, i) => i !== index))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Adaugă etichetă..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    minWidth: '100px',
                    fontSize: '14px'
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      const value = e.target.value.trim()
                      if (value && !editHashtags.includes(value)) {
                        setEditHashtags([...editHashtags, value])
                        e.target.value = ''
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--border-light)',
                  background: 'white',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: 'var(--accent-blue)',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: editLoading ? 0.7 : 1
                }}
              >
                {editLoading ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}