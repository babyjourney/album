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
    
    // Fetch album title and family profile picture
    if (userSession?.familyId) {
      try {
        const response = await fetch(`/api/album-settings/get-title?familyId=${userSession.familyId}`)
        const result = await response.json()
        
        if (response.ok) {
          setAlbumTitle(result.title)
        }
      } catch (error) {
        console.error('Error fetching album title:', error)
      }

      // Fetch family profile picture
      try {
        const { data, error } = await supabase
          .from('families')
          .select('profile_picture_url')
          .eq('id', userSession.familyId)
          .single()

        if (!error && data?.profile_picture_url) {
          setFamilyProfilePicture(data.profile_picture_url)
        }
      } catch (error) {
        console.error('Error fetching family profile picture:', error)
      }
    }
    
    setLoading(false)
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

      {/* Upload Form Modal */}
      {hasEditorAccess && showUploadForm && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ 
            maxWidth: '500px', 
            width: '100%',
            margin: '0 8px',
            maxHeight: '90vh',
            height: 'auto'
          }}>
            <button
              onClick={() => setShowUploadForm(false)}
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