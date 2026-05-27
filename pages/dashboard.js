import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, isEditor, authenticatedFetch, clearSession } from '../lib/pinAuth'
import { useChildren } from '../lib/useChildren'

import FloatingDock from '../components/layout/FloatingDock'
import VerticalRail from '../components/layout/VerticalRail'
import ActionCluster from '../components/layout/ActionCluster'
import SettingsDrawer from '../components/layout/SettingsDrawer'
import FilterDrawer from '../components/layout/FilterDrawer'
import SideSheet from '../components/layout/SideSheet'
import BentoMasonry from '../components/layout/BentoMasonry'

import PostModal from '../components/PostModal'
import UploadForm from '../components/UploadForm'
import CreatePost from '../components/CreatePost'
import ProfilePictureModal from '../components/ProfilePictureModal'
import MemorySlideshow from '../components/MemorySlideshow'

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ date: '', category: 'all', hashtag: '', sort: 'newest' })
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [postCount, setPostCount] = useState(0)
  const [albumTitle, setAlbumTitle] = useState('Family Album')
  const [familyProfilePicture, setFamilyProfilePicture] = useState('')
  const [feedColumns, setFeedColumns] = useState(2)

  // Drawers
  const [showSettings, setShowSettings] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showTextPost, setShowTextPost] = useState(false)
  const [showProfilePicture, setShowProfilePicture] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Modal
  const [selectedPost, setSelectedPost] = useState(null)
  const [allPosts, setAllPosts] = useState([])
  const [currentPostIndex, setCurrentPostIndex] = useState(0)

  // Slideshow
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [slideshowMemories, setSlideshowMemories] = useState([])
  const [slideshowLoading, setSlideshowLoading] = useState(false)

  const router = useRouter()
  const { children, isMultiChild } = useChildren(session?.familyId)

  useEffect(() => { checkAuth() }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('feedColumns')
      if (saved === '2' || saved === '3') setFeedColumns(parseInt(saved, 10))
    } catch {}
  }, [])

  const handleColumnsChange = (n) => {
    setFeedColumns(n)
    try { localStorage.setItem('feedColumns', String(n)) } catch {}
  }

  const checkAuth = async () => {
    if (!isAuthenticated()) { router.push('/login'); return }
    const userSession = getSession()
    setSession(userSession)
    setLoading(false)

    if (!userSession?.familyId) return
    const familyId = userSession.familyId

    const cachedTitle   = sessionStorage.getItem(`albumTitle_${familyId}`)
    const cachedPicture = sessionStorage.getItem(`familyPicture_${familyId}`)
    if (cachedTitle)   setAlbumTitle(cachedTitle)
    if (cachedPicture) setFamilyProfilePicture(cachedPicture)

    const titleAge = sessionStorage.getItem(`albumTitle_${familyId}_time`)
    const picAge   = sessionStorage.getItem(`familyPicture_${familyId}_time`)
    const now = Date.now()
    const cacheAge = 5 * 60 * 1000

    if (!cachedTitle || !titleAge || (now - titleAge) > cacheAge) {
      authenticatedFetch(`/api/album-settings/get-title?familyId=${familyId}`)
        .then(r => r.json()).then(({ title }) => {
          if (title) {
            setAlbumTitle(title)
            sessionStorage.setItem(`albumTitle_${familyId}`, title)
            sessionStorage.setItem(`albumTitle_${familyId}_time`, now.toString())
          }
        }).catch(() => {})
    }
    if (!cachedPicture || !picAge || (now - picAge) > cacheAge) {
      // Direct supabase.from('families') is RLS-blocked under the anon key
      // (see migration.sql strict policy). Go through the family-scoped API
      // which authenticates via the session token + service_role.
      authenticatedFetch(`/api/families/get?familyId=${familyId}`)
        .then(r => r.json())
        .then(({ family }) => {
          if (family?.profile_picture_url) {
            setFamilyProfilePicture(family.profile_picture_url)
            sessionStorage.setItem(`familyPicture_${familyId}`, family.profile_picture_url)
            sessionStorage.setItem(`familyPicture_${familyId}_time`, now.toString())
          }
        }).catch(() => {})
    }
  }

  const handleUploadSuccess = () => { setRefreshTrigger(p => p + 1); setShowUpload(false) }
  const handlePostSuccess   = () => { setRefreshTrigger(p => p + 1); setShowTextPost(false) }

  const handlePostClick = (post, posts, index) => {
    setSelectedPost(post); setAllPosts(posts); setCurrentPostIndex(index)
  }
  const handleModalClose = () => { setSelectedPost(null); setAllPosts([]); setCurrentPostIndex(0) }
  const handlePostDelete = (postId) => {
    setRefreshTrigger(p => p + 1)
    setAllPosts(prev => prev.filter(p => p.id !== postId))
  }
  const handlePostUpdate = (updatedPost) => {
    setAllPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
    setSelectedPost(updatedPost)
    setRefreshTrigger(p => p + 1)
  }
  const handleModalNavigate = (post, index) => { setSelectedPost(post); setCurrentPostIndex(index) }

  const handleHashtagClick = (hashtag) => {
    setSearchQuery('')
    setFilters(prev => ({ ...prev, hashtag }))
    setSelectedPost(null)
  }

  const handleSearchChange = (q) => {
    setSearchQuery(q)
    if (q.trim()) {
      setFilters({ date: '', category: 'all', hashtag: '', sort: 'newest' })
      setSelectedChildId(null)
    }
  }

  const handleChildFilterChange = (childId) => {
    setSelectedChildId(childId)
    if (childId) setSearchQuery('')
  }

  const confirmSignOut = () => {
    clearSession()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '3px solid var(--glass-hairline)',
          borderTopColor: 'var(--accent-iris)',
          animation: 'spin 0.9s linear infinite',
          boxShadow: '0 8px 24px -6px rgba(124,58,237,0.30)',
        }} />
        <div className="text-eyebrow" style={{ color: 'var(--ink-3)' }}>
          Se încarcă albumul…
        </div>
      </div>
    )
  }

  if (!session) return null

  const hasEditorAccess = isEditor()

  const railChildren = isMultiChild ? children : []
  const actionItems = []
  if (hasEditorAccess) {
    actionItems.push({
      tone: 'aqua',
      label: 'New text post',
      onClick: () => setShowTextPost(true),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9"  y1="13" x2="15" y2="13"/>
          <line x1="9"  y1="17" x2="15" y2="17"/>
        </svg>
      ),
    })
  }
  const handleOpenSlideshow = async () => {
    if (!session?.familyId || slideshowLoading) return
    setSlideshowLoading(true)
    try {
      // Mirror BentoMasonry.fetchPosts query serialization so the slideshow
      // respects the user's active filters/search/childId.
      const params = new URLSearchParams({ familyId: session.familyId })
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

      const res = await authenticatedFetch(`/api/photos/list?${params.toString()}`)
      const json = await res.json()
      if (res.ok && json.photos) {
        const media = json.photos.filter(p => p.type !== 'text' && (p.fileUrl || p.file_url))
        if (media.length > 0) {
          setSlideshowMemories(media)
          setShowSlideshow(true)
        }
      }
    } catch (e) { console.error('Slideshow fetch error:', e) }
    finally { setSlideshowLoading(false) }
  }

  // Slideshow always available
  actionItems.push({
    tone: 'peach',
    label: 'Slideshow',
    onClick: handleOpenSlideshow,
    icon: slideshowLoading ? (
      <div style={{ width: 16, height: 16, border: '2px solid var(--glass-hairline-strong)', borderTopColor: 'var(--accent-peach)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  })

  // Upload as primary (last so it's the rightmost in the dock)
  if (hasEditorAccess) {
    actionItems.push({
      tone: 'iris',
      label: 'Upload',
      primary: true,
      onClick: () => setShowUpload(true),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>
      ),
    })
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Top center: floating dock */}
      <FloatingDock
        albumTitle={albumTitle}
        onSearch={() => setShowFilters(true)}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => setShowSignOutConfirm(true)}
        children={railChildren}
        selectedChildId={selectedChildId}
        onSelectChild={isMultiChild ? handleChildFilterChange : undefined}
      />

      {/* Left: vertical rail (desktop only) */}
      <VerticalRail
        onFilters={() => setShowFilters(true)}
        onSearch={handleSearchChange}
        searchQuery={searchQuery}
      />

      {/* Bottom right: action cluster */}
      <ActionCluster items={actionItems} />

      {/* Main content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(120px, env(safe-area-inset-bottom))',
        maxWidth: 1480,
        margin: '0 auto',
      }}>
        {/* Hero greeting */}
        <header style={{ marginBottom: 32 }}>
          <p className="text-eyebrow" style={{ color: 'var(--accent-iris)', marginBottom: 10 }}>
            Family memories
          </p>
          <h1 className="text-display" style={{ fontSize: 'clamp(36px, 6vw, 64px)', marginBottom: 8 }}>
            {albumTitle}
          </h1>
          <p className="text-body" style={{ color: 'var(--ink-2)', fontSize: 16 }}>
            <span className="nums">{postCount}</span> {postCount === 1 ? 'amintire' : 'amintiri'}
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            <span style={{
              background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', fontWeight: 600,
            }}>
              Crește în fiecare zi
            </span>
          </p>
        </header>

        <BentoMasonry
          familyId={session.familyId}
          searchQuery={searchQuery}
          refreshTrigger={refreshTrigger}
          onPostClick={handlePostClick}
          onPostCountUpdate={setPostCount}
          onHashtagClick={handleHashtagClick}
          filters={filters}
          selectedChildId={selectedChildId}
          columns={feedColumns}
        />
      </main>

      {/* Drawers */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onProfilePicture={() => { setShowSettings(false); setShowProfilePicture(true) }}
        onSignOut={() => { setShowSettings(false); setShowSignOutConfirm(true) }}
        columns={feedColumns}
        onColumnsChange={handleColumnsChange}
      />

      <FilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Post detail */}
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

      {/* Upload — centered modal (it has a 2-col grid that needs room) */}
      {hasEditorAccess && showUpload && (
        <div className="modal-scrim" style={{ zIndex: 1000 }} onClick={() => setShowUpload(false)}>
          <div
            className="modal-glass upload-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 980, position: 'relative' }}
          >
            <button
              onClick={() => setShowUpload(false)}
              className="btn-icon"
              aria-label="Close"
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 10001,
                width: 40, height: 40,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6"  y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <UploadForm
              familyId={session.familyId}
              onUploadSuccess={handleUploadSuccess}
              onClose={() => setShowUpload(false)}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Text post — centered modal */}
      {hasEditorAccess && showTextPost && (
        <div className="modal-scrim" style={{ zIndex: 1000 }} onClick={() => setShowTextPost(false)}>
          <div
            className="modal-glass"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 560, width: '100%', position: 'relative' }}
          >
            <button
              onClick={() => setShowTextPost(false)}
              className="btn-icon"
              aria-label="Close"
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, width: 40, height: 40 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6"  y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <CreatePost
              familyId={session.familyId}
              onPostSuccess={handlePostSuccess}
              onPhotoClick={() => { setShowTextPost(false); setShowUpload(true) }}
              onVideoClick={() => { setShowTextPost(false); setShowUpload(true) }}
            />
          </div>
        </div>
      )}

      {/* Profile picture */}
      <ProfilePictureModal
        isOpen={showProfilePicture}
        onClose={() => setShowProfilePicture(false)}
        childName={session?.familyName}
        childImage={familyProfilePicture || '/api/placeholder/80/80'}
      />

      {/* Slideshow */}
      <MemorySlideshow
        isOpen={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        memories={slideshowMemories}
      />

      {/* Sign out confirmation */}
      {showSignOutConfirm && (
        <div className="modal-scrim" style={{ zIndex: 10000 }} onClick={() => setShowSignOutConfirm(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, padding: 28, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 14px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px -6px rgba(245,158,11,0.45), inset 0 1px 0 0 rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.30)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3 className="text-section-title" style={{ fontSize: 18, marginBottom: 6 }}>Ieși din album?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 20 }}>
              Va trebui să te autentifici din nou cu PIN-ul.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSignOutConfirm(false)} className="btn-glass" style={{ flex: 1 }}>
                Rămân
              </button>
              <button
                onClick={confirmSignOut}
                className="sheen"
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'linear-gradient(135deg, #f87171, #dc2626)',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 14, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -6px rgba(220,38,38,0.45), inset 0 1px 0 0 rgba(255,255,255,0.30)',
                }}
              >
                Ieși
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
