import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import MediaThumbnail from './MediaThumbnail'
import MediaTypeCard from './MediaTypeCard'
import { detectFileTypeFromUrl } from '../lib/fileTypes'
import { authenticatedFetch } from '../lib/pinAuth'

// ---------- Multi-photo helpers ----------
const getMultiPhotoUrls = (post) => {
  let urls = null
  let coverIndex = 0

  if (post.file_urls) {
    if (Array.isArray(post.file_urls)) urls = post.file_urls
    else if (typeof post.file_urls === 'string') {
      try { urls = JSON.parse(post.file_urls) } catch { return null }
    }
    if (post.cover_index !== undefined) coverIndex = post.cover_index || 0
  }

  if (!urls && post.description?.includes('__MULTI_PHOTO_URLS__:')) {
    try {
      const marker = '__MULTI_PHOTO_URLS__:'
      const i = post.description.indexOf(marker)
      urls = JSON.parse(post.description.substring(i + marker.length))
      const m = post.description.match(/__COVER_INDEX__:(\d+)/)
      if (m) coverIndex = parseInt(m[1]) || 0
    } catch { return null }
  }

  if (urls && Array.isArray(urls) && urls.length > 1) {
    if (coverIndex > 0 && coverIndex < urls.length) {
      const reordered = [...urls]
      const cover = reordered[coverIndex]
      reordered.splice(coverIndex, 1)
      reordered.unshift(cover)
      return reordered
    }
    return urls
  }
  return null
}

const getCleanDescription = (post) => {
  if (!post.description) return ''
  if (post.file_urls) return post.description
  if (post.description.includes('__MULTI_PHOTO_URLS__:')) {
    const m = '__MULTI_PHOTO_URLS__:'
    return post.description.substring(0, post.description.indexOf(m)).trim()
  }
  return post.description
}

const CATEGORY_LABELS = {
  memories: 'Amintiri', milestones: 'Etape importante', everyday: 'Zilnic',
  special: 'Special', family: 'Familie', play: 'Joacă', learning: 'Învățare',
}

export default function InstagramFeed({ familyId, searchQuery, refreshTrigger, onPostClick, onPostCountUpdate, onHashtagClick, filters, selectedChildId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showError } = useToast()
  const { language } = useLanguage()

  useEffect(() => {
    if (!familyId) return
    const t = setTimeout(fetchPosts, 50)
    return () => clearTimeout(t)
  }, [familyId, refreshTrigger, searchQuery, filters, selectedChildId])

  const fetchPosts = async () => {
    try {
      setLoading(true)
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
        if (filters.sort) params.append('sort', filters.sort)
      }
      if (selectedChildId) params.append('childId', selectedChildId)

      const response = await authenticatedFetch(`/api/photos/list?${params.toString()}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Încărcarea postărilor a eșuat')

      const data = result.photos || []
      setPosts(data)
      onPostCountUpdate && onPostCountUpdate(data.length)
    } catch (e) {
      console.error('Error fetching posts:', e)
      const msg = 'Încărcarea postărilor a eșuat'
      setError(msg); showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (s) => new Date(s).toLocaleDateString(
    language === 'ru' ? 'ru-RU' : 'ro-RO',
    { month: 'short', day: 'numeric', year: 'numeric' }
  )

  // -------- Single card render --------
  const renderPost = (post, index) => {
    const isTextPost = post.type === 'text'
    const isVideo = post.file_type === 'video' || post.type === 'video'
    const primaryKind = detectFileTypeFromUrl(post.file_url)
    const isAudio = post.file_type === 'audio' || post.type === 'audio' || primaryKind === 'audio'
    const isDocument = post.file_type === 'document' || post.type === 'document' || primaryKind === 'document'

    const handleCardClick = (e) => {
      const sc = e.currentTarget.querySelector('.smooth-scroll-container')
      if (sc?.dataset.isScrolling === 'true') return
      if (e.target.closest('.carousel-nav-arrow') || e.target.closest('.carousel-dot')) return
      onPostClick(post, posts, index)
    }

    return (
      <div key={post.id} className="instagram-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
        <div style={{ width: '100%', position: 'relative' }}>
          {isTextPost ? (
            <div style={{
              width: '100%', aspectRatio: '1/1',
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '32px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden style={{
                position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '160%',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 50%)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: 280 }}>
                <div style={{ fontSize: 32, marginBottom: 14, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}>💭</div>
                <p style={{
                  color: 'white', fontSize: 16, fontWeight: 500, lineHeight: 1.45,
                  textShadow: '0 1px 4px rgba(0,0,0,0.18)',
                }}>
                  {getCleanDescription(post) || 'Postare text'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'var(--glass-1)', position: 'relative' }}>
              {(isAudio || isDocument) ? (
                <MediaTypeCard kind={isAudio ? 'audio' : 'document'} url={post.file_url} title={post.title} />
              ) : isVideo ? (
                <MediaThumbnail
                  src={post.file_url}
                  alt={post.title || 'Video'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={() => {}}
                />
              ) : (() => {
                const multi = getMultiPhotoUrls(post)
                if (!multi) {
                  return (
                    <MediaThumbnail
                      src={post.file_url}
                      alt={post.title || 'Post'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )
                }
                return (
                  <>
                    <div
                      className="smooth-scroll-container"
                      style={{
                        display: 'flex', width: '100%', height: '100%',
                        overflowX: 'auto', overflowY: 'hidden',
                        cursor: 'grab', gap: 0,
                      }}
                      onScroll={(e) => {
                        const c = e.target
                        const idx = Math.round(c.scrollLeft / c.clientWidth)
                        const dots = c.parentElement.querySelectorAll('.carousel-dot')
                        dots.forEach((dot, i) => {
                          dot.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.55)'
                          dot.style.transform   = i === idx ? 'scale(1.25)' : 'scale(1)'
                        })
                      }}
                      onMouseDown={(e) => {
                        const c = e.currentTarget
                        c.style.cursor = 'grabbing'
                        c.dataset.isDown = 'true'
                        c.dataset.startX = e.pageX - c.offsetLeft
                        c.dataset.scrollLeft = c.scrollLeft
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.cursor = 'grab'; e.currentTarget.dataset.isDown = 'false' }}
                      onMouseUp={(e)    => { e.currentTarget.style.cursor = 'grab'; e.currentTarget.dataset.isDown = 'false' }}
                      onMouseMove={(e) => {
                        const c = e.currentTarget
                        if (c.dataset.isDown !== 'true') return
                        e.preventDefault()
                        c.scrollLeft = parseFloat(c.dataset.scrollLeft) - ((e.pageX - c.offsetLeft) - parseFloat(c.dataset.startX)) * 2
                      }}
                      onTouchStart={(e) => {
                        const c = e.currentTarget
                        c.dataset.touchStartX = e.touches[0].clientX
                        c.dataset.initialScrollLeft = c.scrollLeft
                      }}
                      onTouchMove={(e) => { e.currentTarget.dataset.isScrolling = 'true' }}
                      onTouchEnd={(e) => {
                        const c = e.currentTarget
                        const dx = Math.abs(e.changedTouches[0].clientX - parseFloat(c.dataset.touchStartX || '0'))
                        const ds = Math.abs(c.scrollLeft - parseFloat(c.dataset.initialScrollLeft || '0'))
                        if (dx > 10 || ds > 10) { e.preventDefault(); e.stopPropagation() }
                        setTimeout(() => { c.dataset.isScrolling = 'false' }, 100)
                      }}
                    >
                      {multi.map((url, i) => (
                        <MediaThumbnail
                          key={i}
                          src={url}
                          alt={`${post.title || 'Post'} - ${i + 1}`}
                          showPlayIcon
                          style={{
                            minWidth: '100%', maxWidth: '100%', width: '100%', height: '100%',
                            objectFit: 'cover', flexShrink: 0, display: 'block',
                          }}
                        />
                      ))}
                    </div>

                    {/* Dots */}
                    <div style={{
                      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', gap: 6, zIndex: 2, padding: '4px 8px',
                      background: 'rgba(0,0,0,0.28)', borderRadius: 999,
                      backdropFilter: 'blur(12px)',
                    }}>
                      {multi.map((_, i) => (
                        <div
                          key={i}
                          className="carousel-dot"
                          style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)',
                            transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            const c = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                            c?.scrollTo({ left: i * c.clientWidth, behavior: 'smooth' })
                          }}
                        />
                      ))}
                    </div>

                    {/* Arrows */}
                    {multi.length > 1 && (
                      <>
                        <button
                          className="carousel-nav-arrow"
                          onClick={(e) => {
                            e.stopPropagation()
                            const c = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                            if (!c) return
                            const idx = Math.round(c.scrollLeft / c.clientWidth)
                            c.scrollTo({ left: Math.max(0, idx - 1) * c.clientWidth, behavior: 'smooth' })
                          }}
                          style={{
                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 34, height: 34, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 3, cursor: 'pointer',
                          }}
                          aria-label="Previous"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"/>
                          </svg>
                        </button>
                        <button
                          className="carousel-nav-arrow"
                          onClick={(e) => {
                            e.stopPropagation()
                            const c = e.target.closest('.instagram-card').querySelector('.smooth-scroll-container')
                            if (!c) return
                            const idx = Math.round(c.scrollLeft / c.clientWidth)
                            c.scrollTo({ left: Math.min(multi.length - 1, idx + 1) * c.clientWidth, behavior: 'smooth' })
                          }}
                          style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 34, height: 34, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 3, cursor: 'pointer',
                          }}
                          aria-label="Next"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      </>
                    )}

                    {/* Multi-photo indicator */}
                    <div className="glass-pill" style={{
                      position: 'absolute', top: 12, right: 12,
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      color: '#fff',
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(255,255,255,0.20)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zM20 16H8V4h12v12zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>
                      </svg>
                      <span className="nums">{multi.length}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Category badge */}
          {post.category && (
            <div className="glass-pill" style={{
              position: 'absolute', top: 12, left: 12,
              padding: '5px 11px', fontSize: 11, fontWeight: 600,
              color: '#fff',
              background: 'rgba(0,0,0,0.42)',
              border: '1px solid rgba(255,255,255,0.20)',
              letterSpacing: '0.02em',
            }}>
              {CATEGORY_LABELS[post.category] || (post.category[0].toUpperCase() + post.category.slice(1))}
            </div>
          )}

          {/* Private badge (visible only to editors — viewers never receive
              private posts from the server) */}
          {post.is_private && (
            <div
              className="glass-pill"
              title="Conținut privat — vizibil doar pentru editori"
              aria-label="Conținut privat"
              style={{
                position: 'absolute',
                top: 12,
                left: post.category ? 'auto' : 12,
                right: post.category ? 'auto' : 'auto',
                ...(post.category ? { left: 'calc(12px + 110px)' } : {}),
                padding: '4px 8px', fontSize: 11, fontWeight: 700,
                color: '#fff',
                background: 'rgba(124, 58, 237, 0.55)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                letterSpacing: '0.02em',
                boxShadow: '0 4px 14px -4px rgba(124, 58, 237, 0.55)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Privat
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--glass-hairline)',
        }}>
          {post.title && (
            <h3 style={{
              fontWeight: 600, marginBottom: 6, fontSize: 15.5,
              color: 'var(--ink-1)', lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}>
              {post.title}
            </h3>
          )}

          {!isTextPost && getCleanDescription(post) && (
            <p style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink-2)' }}>
              {getCleanDescription(post).length > 60
                ? getCleanDescription(post).substring(0, 60) + '…'
                : getCleanDescription(post)}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            {post.hashtags && post.hashtags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                {post.hashtags.slice(0, 2).map((h, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onHashtagClick && onHashtagClick(h) }}
                    style={{
                      padding: '3px 9px',
                      background: 'rgba(124,58,237,0.10)',
                      color: 'var(--accent-iris)',
                      borderRadius: 999, fontSize: 11, fontWeight: 600,
                      border: '1px solid rgba(124,58,237,0.18)',
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.10)' }}
                  >
                    {h.startsWith('#') ? h : `#${h}`}
                  </button>
                ))}
                {post.hashtags.length > 2 && (
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>
                    +{post.hashtags.length - 2}
                  </span>
                )}
              </div>
            ) : <div />}

            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {formatDate(post.created_at)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -------- Loading skeleton --------
  if (loading) {
    return (
      <div className="main-container">
        <div className="instagram-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="instagram-card" style={{ overflow: 'hidden' }}>
              <div className="shimmer" style={{ aspectRatio: '1/1' }} />
              <div style={{ padding: 16, borderTop: '1px solid var(--glass-hairline)' }}>
                <div className="shimmer" style={{ width: '60%', height: 14, borderRadius: 6, marginBottom: 8 }} />
                <div className="shimmer" style={{ width: '40%', height: 12, borderRadius: 6 }} />
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
        <div className="card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <p className="text-body">{error}</p>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="main-container">
        <div className="card-glass" style={{ textAlign: 'center', padding: '56px 28px' }}>
          {searchQuery ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h3 className="text-section-title" style={{ marginBottom: 8 }}>Nu s-au găsit rezultate</h3>
              <p className="text-body" style={{ color: 'var(--ink-2)' }}>
                Nicio postare nu se potrivește cu căutarea pentru &ldquo;{searchQuery}&rdquo;.
                Încercați cuvinte cheie sau etichete diferite.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
              <h3 className="text-section-title" style={{ marginBottom: 8 }}>Împărtășiți prima amintire</h3>
              <p className="text-body" style={{ color: 'var(--ink-2)' }}>
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
        {posts.map((post, i) => renderPost(post, i))}
      </div>
    </div>
  )
}
