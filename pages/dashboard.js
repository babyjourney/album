import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, isEditor, authenticatedFetch } from '../lib/pinAuth'
import { supabase } from '../lib/supabaseClient'
import HeaderIsland from '../components/HeaderIsland'
import InstagramFeed from '../components/InstagramFeed'
import PostModal from '../components/PostModal'
import UploadForm from '../components/UploadForm'
import CreatePost from '../components/CreatePost'
import Header from '../components/Header'
import ProfilePictureModal from '../components/ProfilePictureModal'
import ChildrenFilter from '../components/ChildrenFilter'
import SidebarFilter from '../components/SidebarFilter'
import FloatingSlideshowButton from '../components/FloatingSlideshowButton'

// Add CSS animations for the modal
const modalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalSlideUp {
    from { 
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideUpFromBottom {
    from { 
      transform: translateY(100%);
    }
    to { 
      transform: translateY(0);
    }
  }

  @keyframes fadeInScale {
    from { 
      opacity: 0;
      transform: scale(0.8);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showTextPost, setShowTextPost] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const [allPosts, setAllPosts] = useState([])
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [showProfilePicture, setShowProfilePicture] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [filters, setFilters] = useState({
    date: '',
    category: 'all',
    hashtag: '',
    sort: 'newest'
  })
  const [isMobile, setIsMobile] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('Family Album')
  const [familyProfilePicture, setFamilyProfilePicture] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    
    // Check mobile on mount and resize
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const checkAuth = async () => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const userSession = getSession()
    setSession(userSession)
    
    // Set loading to false immediately to show the interface
    setLoading(false)
    
    // Fetch album title and family profile picture in parallel with caching
    if (userSession?.familyId) {
      const familyId = userSession.familyId
      
      // Check cache first
      const cachedTitle = sessionStorage.getItem(`albumTitle_${familyId}`)
      const cachedPicture = sessionStorage.getItem(`familyPicture_${familyId}`)
      
      if (cachedTitle) {
        setAlbumTitle(cachedTitle)
      }
      if (cachedPicture) {
        setFamilyProfilePicture(cachedPicture)
      }
      
      // Only fetch if not cached or cache is old (5 minutes)
      const titleCacheTime = sessionStorage.getItem(`albumTitle_${familyId}_time`)
      const pictureCacheTime = sessionStorage.getItem(`familyPicture_${familyId}_time`)
      const now = Date.now()
      const cacheAge = 5 * 60 * 1000 // 5 minutes
      
      const promises = []
      
      if (!cachedTitle || !titleCacheTime || (now - titleCacheTime) > cacheAge) {
        const albumTitlePromise = fetch(`/api/album-settings/get-title?familyId=${familyId}`)
          .then(response => response.json())
          .then(result => {
            if (result.title) {
              setAlbumTitle(result.title)
              sessionStorage.setItem(`albumTitle_${familyId}`, result.title)
              sessionStorage.setItem(`albumTitle_${familyId}_time`, now.toString())
            }
          })
          .catch(error => console.error('Error fetching album title:', error))
        promises.push(albumTitlePromise)
      }
      
      if (!cachedPicture || !pictureCacheTime || (now - pictureCacheTime) > cacheAge) {
        const familyPicturePromise = supabase
          .from('families')
          .select('profile_picture_url')
          .eq('id', familyId)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.profile_picture_url) {
              setFamilyProfilePicture(data.profile_picture_url)
              sessionStorage.setItem(`familyPicture_${familyId}`, data.profile_picture_url)
              sessionStorage.setItem(`familyPicture_${familyId}_time`, now.toString())
            }
          })
          .catch(error => console.error('Error fetching family profile picture:', error))
        promises.push(familyPicturePromise)
      }
      
      // Execute any needed requests in parallel
      if (promises.length > 0) {
        Promise.all(promises)
      }
    }
  }

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowUploadForm(false)
  }

  const handlePostSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowTextPost(false)
  }


  const handlePostClick = (post, posts, index) => {
    setSelectedPost(post)
    setAllPosts(posts)
    setCurrentPostIndex(index)
  }

  const handleModalClose = () => {
    setSelectedPost(null)
    setAllPosts([])
    setCurrentPostIndex(0)
  }

  const handlePostDelete = (postId) => {
    setRefreshTrigger(prev => prev + 1)
    // Remove the deleted post from allPosts
    const updatedPosts = allPosts.filter(post => post.id !== postId)
    setAllPosts(updatedPosts)
  }

  const handlePostUpdate = (updatedPost) => {
    // Update the post in allPosts array
    setAllPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    )
    // Update the selected post
    setSelectedPost(updatedPost)
    // Trigger refresh to update the main feed
    setRefreshTrigger(prev => prev + 1)
  }

  const handleModalNavigate = (post, index) => {
    setSelectedPost(post)
    setCurrentPostIndex(index)
  }

  const handleHashtagClick = (hashtag) => {
    // Clear search query and set hashtag filter
    setSearchQuery('')
    setFilters(prev => ({
      ...prev,
      hashtag: hashtag
    }))
    setSelectedPost(null) // Close modal if open
  }

  const handleSearchChange = (query) => {
    setSearchQuery(query)
    // Reset filters when user starts typing in search
    if (query.trim()) {
      setFilters({
        date: '',
        category: 'all',
        hashtag: '',
        sort: 'newest'
      })
      setSelectedChildId(null) // Also reset child filter
    }
  }

  const handleChildFilterChange = (childId) => {
    setSelectedChildId(childId)
    // Clear search when filtering by child
    if (childId) {
      setSearchQuery('')
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const hasEditorAccess = isEditor()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-gray)' }}>
      {/* Add modal styles */}
      <style jsx global>{modalStyles}</style>
      
      {/* Navbar */}
      <Header 
        familyName={session.familyName} 
        role={session.role}
        albumTitle={albumTitle}
      />
      
      {/* Header Island with Create Post */}
      <HeaderIsland
        childName={session.familyName}
        albumTitle={albumTitle}
        postCount={postCount}
        childImage={familyProfilePicture || "/api/placeholder/80/80"}
        onCreatePost={async (postData) => {
          // Handle text post creation directly from header
          const response = await authenticatedFetch('/api/posts/create', {
            method: 'POST',
            body: JSON.stringify({
              type: 'text',
              title: '',
              description: postData.text,
              fileUrl: null,
              category: postData.category,
              hashtags: postData.hashtags
            })
          })
          
          if (!response.ok) {
            throw new Error('Crearea postării a eșuat')
          }
          
          setRefreshTrigger(prev => prev + 1)
        }}
        onPhotoUpload={() => setShowUploadForm(true)}
        onVideoUpload={() => setShowUploadForm(true)}
        onProfilePictureClick={() => setShowProfilePicture(true)}
        hasEditorAccess={hasEditorAccess}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Sidebar Filter - Desktop only */}
      <SidebarFilter
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={setFilters}
        selectedChildId={selectedChildId}
        onChildFilterChange={handleChildFilterChange}
        onCategoryAdded={() => setRefreshTrigger(prev => prev + 1)}
      />

      {/* Children Filter */}
      <ChildrenFilter
        familyId={session?.familyId}
        isVisible={true} // Always visible if multi-child is enabled
        selectedChildId={selectedChildId}
        onChildFilterChange={handleChildFilterChange}
      />

      {/* Main Feed */}
      <main style={{ 
        paddingBottom: '32px',
        // Sidebar floats over content on desktop, no layout adjustment needed
        position: 'relative',
        zIndex: 1
      }}>
        <InstagramFeed
          familyId={session.familyId}
          searchQuery={searchQuery}
          refreshTrigger={refreshTrigger}
          onPostClick={handlePostClick}
          onPostCountUpdate={(count) => setPostCount(count)}
          onHashtagClick={handleHashtagClick}
          filters={filters}
          selectedChildId={selectedChildId}
        />
      </main>

      {/* Modals */}
      {selectedPost && (
        <PostModal
          selectedPost={selectedPost}
          allPosts={allPosts}
          currentIndex={currentPostIndex}
          onClose={handleModalClose}
          onDelete={handlePostDelete}
          onUpdate={handlePostUpdate}
          onNavigate={handleModalNavigate}
          onHashtagClick={handleHashtagClick}
          readOnly={!hasEditorAccess}
        />
      )}

      {/* Enhanced Upload Modal */}
      {hasEditorAccess && showUploadForm && (
        <div 
          className="upload-modal-overlay"
          onClick={(e) => {
            e.stopPropagation()
            setShowUploadForm(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '20px',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            className="upload-modal-container" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%',
              maxWidth: isMobile ? '100%' : '900px',
              height: isMobile ? '100%' : 'auto',
              maxHeight: isMobile ? '100%' : '80vh',
              background: 'white',
              borderRadius: isMobile ? '0' : '12px',
              boxShadow: isMobile 
                ? 'none' 
                : '0 10px 25px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              animation: isMobile 
                ? 'slideUpFromBottom 0.3s ease-out'
                : 'modalSlideUp 0.3s ease-out'
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use setTimeout to ensure the modal closes after all events have processed
                setTimeout(() => {
                  setShowUploadForm(false);
                }, 10);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                top: isMobile ? '16px' : '20px',
                right: isMobile ? '16px' : '20px',
                zIndex: 10001,
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                backgroundColor: isMobile ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                borderRadius: isMobile ? '10px' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '700',
                backdropFilter: 'blur(20px)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
                e.target.style.color = '#EF4444'
                e.target.style.transform = 'scale(1.1) rotate(90deg)'
                e.target.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.25)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = isMobile ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.06)'
                e.target.style.color = 'var(--text-secondary)'
                e.target.style.transform = 'scale(1) rotate(0deg)'
                e.target.style.boxShadow = 'none'
              }}
            >
              ✕
            </button>
            <UploadForm 
              familyId={session.familyId} 
              onUploadSuccess={handleUploadSuccess}
              onClose={() => setShowUploadForm(false)}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Text Post Modal */}
      {hasEditorAccess && showTextPost && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px', width: '100%' }}>
            <button
              onClick={() => setShowTextPost(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                borderRadius: '10px'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'var(--bg-gray)'
                e.target.style.color = 'var(--accent-red)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = 'var(--text-secondary)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m18 6-12 12"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
            <CreatePost
              familyId={session.familyId}
              onPostSuccess={handlePostSuccess}
              onPhotoClick={() => {
                setShowTextPost(false)
                setShowUploadForm(true)
              }}
              onVideoClick={() => {
                setShowTextPost(false)
                setShowUploadForm(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={showProfilePicture}
        onClose={() => setShowProfilePicture(false)}
        childName={session?.familyName}
        childImage={familyProfilePicture || "/api/placeholder/80/80"}
      />

      {/* Floating Slideshow Button */}
      <FloatingSlideshowButton
        familyId={session?.familyId}
      />
      
    </div>
  )
}