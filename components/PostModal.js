import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { authenticatedFetch, isEditor } from '../lib/pinAuth'
import { getCategories } from '../lib/categoriesData'
import InstagramCarousel from './InstagramCarousel'
import DatePicker from './DatePicker'

// Helper function to detect and extract multi-photo URLs with cover reordering
const getMultiPhotoUrls = (post) => {
  let urls = null
  let coverIndex = 0
  
  // Check for file_urls field (works for both 'multi-photo' and 'image' types with multiple files)
  if (post.file_urls) {
    // If file_urls is already an array, use it
    if (Array.isArray(post.file_urls)) {
      urls = post.file_urls
    } else {
      // If it's a string, try to parse it
      try {
        urls = JSON.parse(post.file_urls)
      } catch (e) {
        return null
      }
    }
    
    // Get cover index from post
    if (post.cover_index !== undefined) {
      coverIndex = post.cover_index || 0
    }
  }
  
  // Fallback to old format in description (for compatibility with existing posts)
  if (!urls && post.description && post.description.includes('__MULTI_PHOTO_URLS__:')) {
    try {
      const marker = '__MULTI_PHOTO_URLS__:'
      const markerIndex = post.description.indexOf(marker)
      const urlsJson = post.description.substring(markerIndex + marker.length)
      urls = JSON.parse(urlsJson)
      
      // Extract cover index from old format
      if (post.description.includes('__COVER_INDEX__:')) {
        const coverMatch = post.description.match(/__COVER_INDEX__:(\d+)/)
        if (coverMatch) {
          coverIndex = parseInt(coverMatch[1]) || 0
        }
      }
    } catch (e) {
      return null
    }
  }
  
  // Only process if there are actually multiple URLs
  if (urls && Array.isArray(urls) && urls.length > 1) {
    // Reorder URLs to put the cover image first for carousel display
    if (coverIndex > 0 && coverIndex < urls.length) {
      console.log(`Reordering images for post modal: coverIndex=${coverIndex}, total=${urls.length}`)
      const reorderedUrls = [...urls]
      const coverUrl = reorderedUrls[coverIndex]
      reorderedUrls.splice(coverIndex, 1)
      reorderedUrls.unshift(coverUrl)
      console.log('Original order:', urls.map((url, i) => `${i}: ${url.split('/').pop()}`))
      console.log('Reordered:', reorderedUrls.map((url, i) => `${i}: ${url.split('/').pop()}`))
      return reorderedUrls
    }
    
    return urls
  }
  
  return null
}

// Helper function to clean description from old multi-photo format
const getCleanDescription = (post) => {
  if (!post.description) return ''
  
  // If this is a new format multi-photo post, just return the description as-is
  if (post.file_urls && Array.isArray(post.file_urls) && post.file_urls.length > 1) {
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
  const { t } = useLanguage()

  useOnClickOutside(menuRef, () => setShowMenu(false))

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: isDescriptionExpanded ? '200px' : '40px',
        right: '16px',
        zIndex: 30,
        transition: 'bottom 220ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      {showMenu && (
        <div
          className="glass-strong specular animate-slide-up"
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            borderRadius: '20px',
            padding: '8px',
            minWidth: '180px',
            boxShadow: '0 24px 60px -16px rgba(15,15,30,0.28), inset 0 1px 0 0 var(--glass-hairline-strong)'
          }}
        >
          {!isTextPost && currentPost.file_url && (
            <button
              onClick={() => {
                if (onDownload) onDownload()
                setShowMenu(false)
              }}
              className="btn-ghost"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                color: 'var(--ink-1)',
                fontSize: '14px',
                fontWeight: 500,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              {t('download')}
            </button>
          )}

          <button
            onClick={() => {
              onEdit()
              setShowMenu(false)
            }}
            className="btn-ghost"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '14px',
              color: 'var(--ink-1)',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 2 2L13 12l-4 1 1-4 7.5-7.5z"/>
            </svg>
            {t('edit')}
          </button>

          <button
            onClick={() => {
              onDelete()
              setShowMenu(false)
            }}
            className="btn-ghost"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '14px',
              color: 'var(--accent-red)',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            {t('delete')}
          </button>
        </div>
      )}

      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn-icon"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '999px',
          color: 'var(--ink-1)',
          transform: showMenu ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
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
  onUpdate,
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
  const [editDate, setEditDate] = useState(null)
  const [editCategory, setEditCategory] = useState('')
  const [editCoverIndex, setEditCoverIndex] = useState(0)
  const [editPhotoOrder, setEditPhotoOrder] = useState([])
  const [editIsPrivate, setEditIsPrivate] = useState(false)
  const [categories, setCategories] = useState([])
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndexInternal] = useState(0)
  
  const setCurrentImageIndex = setCurrentImageIndexInternal
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const modalRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const multiPhotoScrollRef = useRef(null)

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

  // Debug editCoverIndex changes
  useEffect(() => {
    console.log('editCoverIndex changed to:', editCoverIndex)
  }, [editCoverIndex])

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories()
        setCategories(cats)
      } catch (error) {
        console.error('Error loading categories:', error)
        // Fallback to default categories
        setCategories([
          { value: 'memories', label: 'Amintiri', emoji: '📸' },
          { value: 'milestones', label: 'Etape importante', emoji: '🎉' },
          { value: 'everyday', label: 'Zilnic', emoji: '☀️' },
          { value: 'special', label: 'Special', emoji: '✨' }
        ])
      }
    }
    loadCategories()
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
    setEditDate(currentPost.created_at ? new Date(currentPost.created_at) : null)
    setEditCategory(currentPost.category || '')
    setEditIsPrivate(currentPost.is_private === true)
    
    // Set cover index for multi-photo posts
    let coverIndex = 0
    if (currentPost.cover_index !== undefined) {
      coverIndex = currentPost.cover_index
    } else if (currentPost.description && currentPost.description.includes('__COVER_INDEX__:')) {
      // Parse from old format
      try {
        const coverMatch = currentPost.description.match(/__COVER_INDEX__:(\d+)/)
        if (coverMatch) {
          coverIndex = parseInt(coverMatch[1]) || 0
        }
      } catch (e) {
        coverIndex = 0
      }
    }
    setEditCoverIndex(coverIndex)
    
    // Initialize photo order
    const multiUrls = getMultiPhotoUrls(currentPost)
    if (multiUrls && multiUrls.length > 1) {
      setEditPhotoOrder([...multiUrls])
    } else {
      setEditPhotoOrder([])
    }
    
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    try {

      // Preserve existing file_urls for multi-photo posts
      const updateData = {
        postId: currentPost.id,
        title: editTitle,
        description: editDescription,
        hashtags: editHashtags.map(tag => `#${tag}`), // Send as array, not joined string
        customDate: editDate,
        coverIndex: editCoverIndex,
        category: editCategory,
        isPrivate: editIsPrivate
      }

      // CRITICAL: Use reordered photo URLs if available
      // Check if this is ANY kind of multi-photo post
      const multiUrls = editPhotoOrder.length > 0 ? editPhotoOrder : getMultiPhotoUrls(currentPost)
      
      // Always use reordered URLs if available, otherwise preserve original
      if (editPhotoOrder.length > 0) {
        updateData.file_urls = editPhotoOrder
      } else if (currentPost.file_urls !== undefined && currentPost.file_urls !== null) {
        updateData.file_urls = currentPost.file_urls
      } else if (multiUrls && multiUrls.length > 1) {
        // If we detected multi-photo URLs from ANY source, preserve them
        updateData.file_urls = multiUrls
      } else if (currentPost.description && currentPost.description.includes('__MULTI_PHOTO_URLS__:')) {
        // If description contains multi-photo data, don't modify it
        updateData.description = currentPost.description
      }

      const response = await authenticatedFetch('/api/posts/update', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (response.ok) {
        // Use the response from the server to ensure we have the latest data
        const serverPost = result.post
        const updatedPost = { 
          ...currentPost, 
          ...serverPost, // Use server response as base
          title: editTitle,
          description: editDescription,
          hashtags: editHashtags.map(tag => `#${tag}`), // Keep as array to match database format
        }
        setCurrentPost(updatedPost)
        setShowEditModal(false)
        showSuccess(t('success'))
        
        // Trigger refresh in parent component
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(updatedPost)
        }
      } else {
        throw new Error(result.error || 'Failed to update post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      showError(error.message || t('error'))
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

  // Handle post/index changes
  useEffect(() => {
    setCurrentPost(selectedPost)
    setCurrentIdx(currentIndex)
    setCurrentImageIndex(0) // Reset image index when post changes
    setIsDescriptionExpanded(false) // Reset description expansion when changing posts
  }, [selectedPost, currentIndex])

  // Handle mobile layout changes separately
  useEffect(() => {
    // Scroll to correct position immediately
    if (isMobile) {
      setIsInitializing(true)
      // Use multiple frames to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('.mobile-scroll-container')
          if (scrollContainer) {
            const targetTop = currentIdx * window.innerHeight
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
  }, [isMobile, currentIdx])

  // Direct scroll to image
  const scrollToImage = (index) => {
    if (multiPhotoScrollRef.current) {
      const imageWidth = multiPhotoScrollRef.current.offsetWidth
      multiPhotoScrollRef.current.scrollTo({
        left: index * imageWidth,
        behavior: 'smooth'
      })
    }
  }

  // Sync scroll position when currentImageIndex changes
  useEffect(() => {
    scrollToImage(currentImageIndex)
  }, [currentImageIndex])

  useEffect(() => {
    const handleKeyPress = (e) => {
      const multiPhotoUrls = getCurrentMultiPhotoUrls()
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        console.log('⬅️ LEFT ARROW pressed')
        // Navigate to previous photo within the same post (only if multi-photo)
        if (multiPhotoUrls && multiPhotoUrls.length > 1) {
          console.log('⬅️ Multi-photo post: navigating to previous photo')
          navigateToImage('prev')
        } else {
          console.log('⬅️ Single photo post, no photo navigation')
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        console.log('➡️ RIGHT ARROW pressed')
        // Navigate to next photo within the same post (only if multi-photo)
        if (multiPhotoUrls && multiPhotoUrls.length > 1) {
          console.log('➡️ Multi-photo post: navigating to next photo')
          navigateToImage('next')
        } else {
          console.log('➡️ Single photo post, no photo navigation')
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Navigate to previous post (with wrapping)
        const newIdx = currentIdx > 0 ? currentIdx - 1 : allPosts.length - 1
        navigateToPost(newIdx)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Navigate to next post (with wrapping)
        const newIdx = currentIdx < allPosts.length - 1 ? currentIdx + 1 : 0
        navigateToPost(newIdx)
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
  }, [currentIdx, allPosts, onNavigate, onClose, currentImageIndex])


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
    
    if (!multiPhotoUrls || multiPhotoUrls.length <= 1) {
      return
    }

    let newIndex = currentImageIndex
    if (direction === 'next') {
      newIndex = currentImageIndex < multiPhotoUrls.length - 1 ? currentImageIndex + 1 : 0
    } else if (direction === 'prev') {
      newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : multiPhotoUrls.length - 1
    }
    
    console.log(`🔄 ${direction}: ${currentImageIndex} -> ${newIndex}`)
    setCurrentImageIndex(newIndex)
  }

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteText'))) {
      return
    }

    try {
      const response = await authenticatedFetch('/api/photos/delete', {
        method: 'DELETE',
        body: JSON.stringify({
          photoId: currentPost.id,
          fileUrl: currentPost.file_url
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('error'))
      }

      showSuccess(t('success'))
      
      if (onDelete) {
        onDelete(currentPost.id)
      }
      
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
      showError(t('error'))
    }
  }

  const handleDownload = async () => {
    if (!currentPost.file_url || currentPost.type === 'text') {
      showError(t('error'))
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
      
      showSuccess(t('success'))
    } catch (error) {
      console.error('Download failed:', error)
      showError(t('error'))
    }
  }

  const formatDate = (dateString) => {
    const { language } = useLanguage()
    const locale = language === 'ru' ? 'ru-RU' : 'ro-RO'
    
    return new Date(dateString).toLocaleDateString(locale, {
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
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-icon"
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 30,
            width: '40px',
            height: '40px',
            color: 'var(--ink-1)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>

        <div
          className="glass-pill nums"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 30,
            padding: '8px 14px',
            color: 'var(--ink-1)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
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
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #4338ca 100%)',
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
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.18))'
                      }}>💭</div>
                      <p style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        fontWeight: 500,
                        lineHeight: '1.55',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
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

        {(currentPost.title || getCleanDescription(currentPost) || (currentPost.hashtags && currentPost.hashtags.length > 0)) && (
          <div style={{
            position: 'fixed',
            bottom: '-10px',
            left: '0',
            right: '0',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.6) 60%, transparent 100%)',
            color: '#ffffff',
            padding: isDescriptionExpanded ? '18px 16px 20px' : '10px 16px 20px',
            maxHeight: isDescriptionExpanded ? '60vh' : '120px',
            overflow: isDescriptionExpanded ? 'visible' : 'hidden',
            transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            transform: isDescriptionExpanded ? 'translateY(0)' : 'translateY(0)',
            zIndex: 15
          }}>
            {currentPost.title && (
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '4px',
                color: '#ffffff',
                lineHeight: '1.3',
                letterSpacing: '-0.01em',
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
                    lineHeight: isDescriptionExpanded ? '1.45' : '1.3',
                    color: 'rgba(255, 255, 255, 0.92)',
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
                        color: 'rgba(255, 255, 255, 0.72)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 0',
                        textDecoration: 'none',
                        fontWeight: 500
                      }}
                    >
                      {isDescriptionExpanded ? t('seeLess') : t('seeMore')}
                    </button>
                  )}
                </div>
              )
            })()}

            {currentPost.hashtags && currentPost.hashtags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                {(isDescriptionExpanded ? currentPost.hashtags : currentPost.hashtags.slice(0, 3)).map((hashtag, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      onHashtagClick && onHashtagClick(hashtag)
                      onClose()
                    }}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(167, 139, 250, 0.28)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 500,
                      border: '1px solid rgba(167, 139, 250, 0.45)',
                      cursor: 'pointer',
                      transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      lineHeight: 1.4,
                      display: 'inline-block',
                      verticalAlign: 'baseline'
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.background = 'rgba(167, 139, 250, 0.42)'
                      e.currentTarget.style.transform = 'scale(0.95)'
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.background = 'rgba(167, 139, 250, 0.28)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                  </button>
                ))}
                {!isDescriptionExpanded && currentPost.hashtags.length > 3 && (
                  <span style={{
                    padding: '4px 10px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '11px',
                    fontStyle: 'italic'
                  }}>
                    +{currentPost.hashtags.length - 3} {t('more')}
                  </span>
                )}
              </div>
            )}

            {isDescriptionExpanded && (
              <div style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '2px',
                textAlign: 'center',
                letterSpacing: '0.04em'
              }}>
                {formatDate(currentPost.created_at)}
              </div>
            )}
          </div>
        )}

        {showEditModal && (
          <div
            onClick={() => setShowEditModal(false)}
            className="modal-scrim"
            style={{ zIndex: 2000 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="modal-glass specular"
              style={{
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                maxHeight: '85vh',
                overflow: 'auto',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-icon"
                style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40 }}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m18 6-12 12"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>

              <h3 className="text-section-title" style={{ marginBottom: '20px', paddingRight: '40px' }}>
                {t('editPost')}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  {t('title')}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('titlePlaceholder')}
                  className="input-glass"
                  style={{ width: '100%' }}
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
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  {t('description')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('addDescription')}
                  className="input-glass"
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    minHeight: '88px',
                    fontFamily: 'inherit'
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
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  {t('tags')}
                </label>
                <div
                  className="input-glass"
                  style={{
                    minHeight: '44px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px'
                  }}
                >
                  {editHashtags.map((tag, index) => (
                    <span key={index} style={{
                      background: 'rgba(124,58,237,0.10)',
                      color: 'var(--accent-iris)',
                      border: '1px solid rgba(124,58,237,0.18)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      lineHeight: 1.2
                    }}>
                      {tag.startsWith('#') ? tag : `#${tag}`}
                      <button
                        onClick={() => removeHashtag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-iris)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        aria-label="Remove tag"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m18 6-12 12"/>
                          <path d="m6 6 12 12"/>
                        </svg>
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={editHashtagInput}
                    onChange={(e) => setEditHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder={editHashtags.length === 0 ? t('hashtagInputPlaceholder') : ""}
                    style={{
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: '120px',
                      padding: '4px 0',
                      fontSize: '14px',
                      background: 'transparent',
                      color: 'var(--ink-1)'
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
                <p className="text-subtle" style={{ marginTop: '6px', fontSize: '12px' }}>
                  {t('hashtagInputHelp')}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <DatePicker
                  value={editDate}
                  onChange={setEditDate}
                  label={t('postDate')}
                />
              </div>

              {isEditor() && (
                <div style={{ marginBottom: '20px' }}>
                  <label
                    htmlFor="edit-private-toggle-desktop"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `1px solid ${editIsPrivate ? 'rgba(124, 58, 237, 0.45)' : 'var(--glass-hairline)'}`,
                      background: editIsPrivate ? 'rgba(124, 58, 237, 0.10)' : 'var(--glass-1)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="edit-private-toggle-desktop"
                      type="checkbox"
                      checked={editIsPrivate}
                      onChange={(e) => setEditIsPrivate(e.target.checked)}
                      style={{ marginTop: '3px', accentColor: 'var(--accent-iris)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{
                        fontSize: '13px', fontWeight: 600, color: 'var(--ink-1)',
                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}>
                        Conținut privat <span aria-hidden="true">🔒</span>
                      </span>
                      <span className="text-subtle" style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
                        Vizibil doar pentru editori (părinți), nu și pentru vizualizatori.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {(() => {
                const multiUrls = editPhotoOrder.length > 0 ? editPhotoOrder : getMultiPhotoUrls(currentPost)
                if (multiUrls && multiUrls.length > 1) {
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                        Cover / Thumbnail
                      </label>
                      <div
                        className="glass-soft"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: '14px'
                        }}
                      >
                        {multiUrls.map((url, index) => {
                          const isVideo = url.toLowerCase().includes('.mp4') ||
                                         url.toLowerCase().includes('.mov') ||
                                         url.toLowerCase().includes('.webm') ||
                                         url.toLowerCase().includes('.avi')

                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('Thumbnail clicked:', index)
                                setEditCoverIndex(index)
                              }}
                              style={{
                                position: 'relative',
                                width: '60px',
                                height: '60px',
                                borderRadius: '10px',
                                background: !isVideo ? `url(${url}) center/cover no-repeat` : 'var(--glass-2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: index === editCoverIndex
                                  ? '2px solid var(--accent-iris)'
                                  : '1px solid var(--glass-hairline)',
                                boxShadow: index === editCoverIndex
                                  ? '0 0 0 3px rgba(124,58,237,0.18)'
                                  : 'none',
                                cursor: 'pointer',
                                transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                                padding: 0
                              }}
                            >
                              {isVideo && (
                                <div style={{
                                  color: 'var(--ink-2)',
                                  fontSize: '16px',
                                  background: 'var(--glass-3)',
                                  borderRadius: '50%',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  ▶
                                </div>
                              )}

                              {index === editCoverIndex && (
                                <div style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: 'var(--accent-iris)',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 8px rgba(124,58,237,0.45)'
                                }}>
                                  ✓
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-subtle" style={{ marginTop: '6px', fontSize: '12px' }}>
                        Selectează care imagine/video să fie afișat ca thumbnail în grid.
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-glass"
                  style={{ padding: '10px 18px' }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading}
                  className="btn-iris sheen"
                  style={{ padding: '10px 18px', opacity: editLoading ? 0.7 : 1 }}
                >
                  {editLoading ? t('saving') : t('save')}
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
      className="modal-scrim"
      onClick={handleOverlayClick}
      style={{
        zIndex: 1000,
        padding: '20px'
      }}
    >
      {currentIdx > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigateToPost(currentIdx - 1)
          }}
          className="btn-icon"
          style={{
            position: 'absolute',
            left: '36px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1002,
            width: '44px',
            height: '44px',
            color: 'var(--ink-1)'
          }}
          aria-label="Previous"
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
          className="btn-icon"
          style={{
            position: 'absolute',
            right: '36px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1002,
            width: '44px',
            height: '44px',
            color: 'var(--ink-1)'
          }}
          aria-label="Next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      )}

      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 1002,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {!isTextPost && currentPost.file_url && (
          <button
            onClick={handleDownload}
            className="btn-icon"
            style={{ width: '40px', height: '40px', color: 'var(--ink-1)' }}
            title={t('download')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </button>
        )}

        {!readOnly && (
          <button
            onClick={handleEdit}
            className="btn-icon"
            style={{ width: '40px', height: '40px', color: 'var(--ink-1)' }}
            title={t('edit')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 2 2L13 12l-4 1 1-4 7.5-7.5z"/>
            </svg>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-icon"
          style={{ width: '40px', height: '40px', color: 'var(--ink-1)' }}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      <div
        className="glass-pill nums"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 1002,
          padding: '10px 16px',
          color: 'var(--ink-1)',
          fontSize: '13px',
          fontWeight: 600
        }}
      >
        {currentIdx + 1} / {allPosts.length}
      </div>

      <div
        ref={modalRef}
        style={{
          display: 'flex',
          width: 'calc(100vw - 40px)',
          height: 'calc(100vh - 40px)',
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 24px 60px -16px rgba(15,15,30,0.45), inset 0 1px 0 0 var(--glass-hairline-strong)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #4338ca 100%)',
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
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.18))'
                }}>💭</div>
                <p style={{
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 500,
                  lineHeight: '1.55',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
                  maxWidth: '420px'
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
                        ref={multiPhotoScrollRef}
                      >
{multiPhotoUrls.map((url, index) => {
                          const isVideo = url.toLowerCase().includes('.mp4') || 
                                         url.toLowerCase().includes('.mov') || 
                                         url.toLowerCase().includes('.avi') || 
                                         url.toLowerCase().includes('.webm') || 
                                         url.toLowerCase().includes('.ogg')
                          
                          return isVideo ? (
                            <video
                              key={index}
                              src={url}
                              controls
                              playsInline
                              preload="metadata"
                              webkit-playsinline="true"
                              crossOrigin="anonymous"
                              style={{ 
                                minWidth: '100%',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                scrollSnapAlign: 'start',
                                transform: 'translateZ(0)',
                                willChange: 'transform',
                                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                                backfaceVisibility: 'hidden'
                              }}
                              onError={(e) => {
                                console.error('Video failed to load:', url)
                                console.error('Video error event:', e)
                                // Show a fallback instead of hiding completely
                                e.target.style.background = '#f0f0f0'
                                e.target.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 24px;">⚠️ Video încărcare eșuată</div>'
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
                              key={index}
                              src={url}
                              alt={`${currentPost.title || 'Post'} - ${index + 1}/${multiPhotoUrls.length}`}
                              style={{ 
                                minWidth: '100%',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                scrollSnapAlign: 'start',
                                transform: 'translateZ(0)',
                                willChange: 'transform',
                                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                                backfaceVisibility: 'hidden',
                                imageRendering: 'auto'
                              }}
                            />
                          )
                        })}
                      </div>
                      
                      {multiPhotoUrls.length > 1 && (
                        <>
                          <button
                            className="modal-carousel-nav-arrow modal-carousel-nav-prev"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToImage('prev')
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '60px',
                              left: '20px',
                              zIndex: 30,
                              opacity: currentImageIndex > 0 ? 1 : 0.4,
                              pointerEvents: currentImageIndex > 0 ? 'auto' : 'none'
                            }}
                            aria-label="Previous image"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m15 18-6-6 6-6"/>
                            </svg>
                          </button>

                          <button
                            className="modal-carousel-nav-arrow modal-carousel-nav-next"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToImage('next')
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '60px',
                              right: '20px',
                              zIndex: 30,
                              opacity: currentImageIndex < multiPhotoUrls.length - 1 ? 1 : 0.4,
                              pointerEvents: currentImageIndex < multiPhotoUrls.length - 1 ? 'auto' : 'none'
                            }}
                            aria-label="Next image"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </button>
                        </>
                      )}
                      
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 25,
                        background: 'rgba(15, 15, 30, 0.55)',
                        padding: '10px 16px',
                        borderRadius: '999px',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 8px 24px -8px rgba(0,0,0,0.35)'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {multiPhotoUrls.map((_, index) => (
                            <div
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentImageIndex(index)
                                scrollToImage(index)
                              }}
                              style={{
                                width: index === currentImageIndex ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '999px',
                                background: index === currentImageIndex
                                  ? 'rgba(255,255,255,0.95)'
                                  : 'rgba(255,255,255,0.42)',
                                cursor: 'pointer',
                                transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                                boxShadow: index === currentImageIndex
                                  ? '0 0 0 2px rgba(255, 255, 255, 0.18), 0 2px 8px rgba(0, 0, 0, 0.4)'
                                  : 'none',
                                transform: index === currentImageIndex ? 'scale(1.1)' : 'scale(1)'
                              }}
                            />
                          ))}
                        </div>
                        <div className="nums" style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontWeight: 500,
                          letterSpacing: '0.02em'
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

        <div
          className="glass-strong"
          style={{
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderLeft: '1px solid var(--glass-hairline)',
            borderRadius: 0
          }}
        >
          <div style={{
            padding: '28px 22px 16px 22px',
            borderBottom: '1px solid var(--glass-hairline)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ flex: '1', marginRight: '12px' }}>
                <h2 className="text-section-title" style={{
                  marginBottom: '6px',
                  lineHeight: '1.25',
                  wordBreak: 'break-word'
                }}>
                  {currentPost.title || 'Postare'}
                </h2>
                <p className="text-subtle" style={{
                  fontSize: '12px',
                  margin: 0,
                  letterSpacing: '0.01em'
                }}>
                  {formatDate(currentPost.created_at)}
                </p>
              </div>
            </div>

            {currentPost.category && (
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '5px 11px',
                  background: 'rgba(124,58,237,0.10)',
                  color: 'var(--accent-iris)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  {(() => {
                    const category = categories.find(cat => cat.value === currentPost.category)
                    if (category) {
                      return `${category.emoji ? category.emoji + ' ' : ''}${category.label}`
                    }
                    return currentPost.category.charAt(0).toUpperCase() + currentPost.category.slice(1)
                  })()}
                </span>
              </div>
            )}
          </div>

          <div style={{
            padding: '20px 22px',
            flex: '1',
            overflow: 'auto'
          }}>
            {getCleanDescription(currentPost) && !isTextPost && (
              <div style={{ marginBottom: '24px' }}>
                <h4 className="text-eyebrow" style={{ marginBottom: '10px' }}>
                  {t('description')}
                </h4>
                <p style={{
                  fontSize: '14.5px',
                  lineHeight: '1.6',
                  color: 'var(--ink-1)',
                  margin: 0,
                  padding: '14px 16px',
                  background: 'var(--glass-2)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  borderRadius: '14px',
                  border: '1px solid var(--glass-hairline)',
                  borderLeft: '3px solid var(--accent-iris)'
                }}>
                  {getCleanDescription(currentPost)}
                </p>
              </div>
            )}

            {currentPost.hashtags && currentPost.hashtags.length > 0 && (
              <div>
                <h4 className="text-eyebrow" style={{ marginBottom: '12px' }}>
                  {t('tags')} ({currentPost.hashtags.length})
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
                        padding: '4px 10px',
                        background: 'rgba(124,58,237,0.10)',
                        color: 'var(--accent-iris)',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid rgba(124,58,237,0.18)',
                        cursor: 'pointer',
                        transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(124,58,237,0.18)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(124,58,237,0.10)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div
          onClick={() => setShowEditModal(false)}
          className="modal-scrim"
          style={{ zIndex: 1003 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-glass specular"
            style={{
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowEditModal(false)}
              className="btn-icon"
              style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40 }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m18 6-12 12"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>

            <h3 className="text-section-title" style={{ marginBottom: '20px', paddingRight: '40px' }}>
              {t('edit')} postarea
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                {t('description')}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="input-glass"
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: '76px',
                  fontFamily: 'inherit'
                }}
                placeholder={t('postDescription')}
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
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                {t('tags')}
              </label>
              <div
                className="input-glass"
                style={{
                  minHeight: '44px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                  padding: '8px'
                }}
              >
                {editHashtags.map((tag, index) => (
                  <span key={index} style={{
                    background: 'rgba(124,58,237,0.10)',
                    color: 'var(--accent-iris)',
                    border: '1px solid rgba(124,58,237,0.18)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    lineHeight: 1.2
                  }}>
                    {tag.startsWith('#') ? tag : `#${tag}`}
                    <button
                      onClick={() => setEditHashtags(editHashtags.filter((_, i) => i !== index))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-iris)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      aria-label="Remove tag"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m18 6-12 12"/>
                        <path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={t('addHashtag')}
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    minWidth: '100px',
                    fontSize: '14px',
                    background: 'transparent',
                    color: 'var(--ink-1)'
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

            <div style={{ marginBottom: '16px' }}>
              <DatePicker
                value={editDate}
                onChange={setEditDate}
                label={t('postDate')}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                Categorie
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="input-glass"
                style={{
                  width: '100%',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%237c3aed\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.4em 1.4em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Selectează o categorie</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                  </option>
                ))}
              </select>
            </div>

            {isEditor() && (
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="edit-private-toggle-mobile"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${editIsPrivate ? 'rgba(124, 58, 237, 0.45)' : 'var(--glass-hairline)'}`,
                    background: editIsPrivate ? 'rgba(124, 58, 237, 0.10)' : 'var(--glass-1)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    id="edit-private-toggle-mobile"
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: 'var(--accent-iris)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600, color: 'var(--ink-1)',
                      display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                      Conținut privat <span aria-hidden="true">🔒</span>
                    </span>
                    <span className="text-subtle" style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
                      Vizibil doar pentru editori (părinți), nu și pentru vizualizatori.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {(() => {
              const multiUrls = getMultiPhotoUrls(currentPost)
              if (multiUrls && multiUrls.length > 1) {
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                      Cover / Thumbnail
                    </label>
                    <div
                      className="glass-soft"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                        gap: '8px',
                        padding: '16px',
                        borderRadius: '14px'
                      }}
                    >
                      {multiUrls.map((url, index) => {
                        const isVideo = url.toLowerCase().includes('.mp4') ||
                                       url.toLowerCase().includes('.mov') ||
                                       url.toLowerCase().includes('.webm') ||
                                       url.toLowerCase().includes('.avi')

                        return (
                          <div
                            key={index}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString())
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                              if (draggedIndex !== index) {
                                const newOrder = [...multiUrls]
                                const draggedItem = newOrder[draggedIndex]
                                newOrder.splice(draggedIndex, 1)
                                newOrder.splice(index, 0, draggedItem)
                                setEditPhotoOrder(newOrder)
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setEditCoverIndex(index)
                            }}
                            style={{
                              position: 'relative',
                              width: '80px',
                              height: '80px',
                              borderRadius: '12px',
                              background: !isVideo ? `url(${url}) center/cover no-repeat` : 'var(--glass-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: index === editCoverIndex
                                ? '2px solid var(--accent-iris)'
                                : '1px solid var(--glass-hairline)',
                              boxShadow: index === editCoverIndex
                                ? '0 0 0 3px rgba(124,58,237,0.18)'
                                : 'none',
                              cursor: 'grab',
                              userSelect: 'none',
                              transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
                          >
                            {isVideo && (
                              <div style={{
                                color: 'var(--ink-2)',
                                fontSize: '20px',
                                background: 'var(--glass-3)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                ▶
                              </div>
                            )}

                            {index === editCoverIndex && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'var(--accent-iris)',
                                color: '#ffffff',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(124,58,237,0.45)'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-subtle" style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      lineHeight: '1.4'
                    }}>
                      Selectează care imagine/video să fie afișat ca thumbnail în grid. Trage și lasă pentru a rearanja ordinea pozelor.
                    </p>
                  </div>
                )
              }
              return null
            })()}

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                className="btn-glass"
                style={{ padding: '10px 18px' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="btn-iris sheen"
                style={{ padding: '10px 18px', opacity: editLoading ? 0.7 : 1 }}
              >
                {editLoading ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}