import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import MediaThumbnail from '../MediaThumbnail'

// Multi-photo helpers (same logic as InstagramFeed but isolated here)
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
      const m = '__MULTI_PHOTO_URLS__:'
      const i = post.description.indexOf(m)
      urls = JSON.parse(post.description.substring(i + m.length))
      const cm = post.description.match(/__COVER_INDEX__:(\d+)/)
      if (cm) coverIndex = parseInt(cm[1]) || 0
    } catch { return null }
  }
  if (urls && Array.isArray(urls) && urls.length > 1) {
    if (coverIndex > 0 && coverIndex < urls.length) {
      const r = [...urls]
      const c = r[coverIndex]
      r.splice(coverIndex, 1)
      r.unshift(c)
      return r
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
const getCoverUrl = (post) => {
  const m = getMultiPhotoUrls(post)
  if (m && m.length > 1) return m[0]
  return post.file_url
}

const CATEGORY_LABELS = {
  memories: 'Amintiri', milestones: 'Etape importante', everyday: 'Zilnic',
  special: 'Special', family: 'Familie', play: 'Joacă', learning: 'Învățare',
}

// Bento sizing pattern — repeats every 7 cards.
// Returns { gridColumn, gridRow } CSS values for a 4-column grid.
const BENTO_PATTERN = [
  { c: 'span 2', r: 'span 2' },  // hero
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 2' },  // tall
  { c: 'span 2', r: 'span 1' },  // wide
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
]

export default function BentoMasonry({ familyId, searchQuery, refreshTrigger, onPostClick, onPostCountUpdate, onHashtagClick, filters, selectedChildId }) {
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

      const response = await fetch(`/api/photos/list?${params.toString()}`)
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

  const renderCard = (post, index) => {
    const isTextPost = post.type === 'text'
    const isVideo = post.file_type === 'video' || post.type === 'video'
    const cover = getCoverUrl(post)
    const multi = getMultiPhotoUrls(post)
    const desc = getCleanDescription(post)
    const slot = BENTO_PATTERN[index % BENTO_PATTERN.length]

    return (
      <article
        key={post.id}
        onClick={() => onPostClick(post, posts, index)}
        style={{
          gridColumn: slot.c,
          gridRow: slot.r,
          minHeight: 0, minWidth: 0,
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          cursor: 'pointer',
          background: 'var(--glass-2)',
          border: '1px solid var(--glass-hairline)',
          boxShadow:
            '0 12px 40px -12px rgba(15,15,30,0.20),' +
            ' inset 0 1px 0 0 var(--glass-hairline-strong)',
          transition: 'transform 360ms cubic-bezier(0.22,1,0.36,1), box-shadow 360ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 28px 60px -16px rgba(15,15,30,0.32), inset 0 1px 0 0 var(--glass-hairline-strong)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 12px 40px -12px rgba(15,15,30,0.20), inset 0 1px 0 0 var(--glass-hairline-strong)'
        }}
      >
        {/* Media area */}
        {isTextPost ? (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 28, textAlign: 'center', overflow: 'hidden',
          }}>
            <div aria-hidden style={{
              position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '160%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            <p style={{
              position: 'relative', zIndex: 1,
              color: '#fff', fontSize: 18, fontWeight: 500,
              lineHeight: 1.4,
              textShadow: '0 1px 6px rgba(0,0,0,0.20)',
              maxWidth: 320,
              fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}>
              {desc || 'Postare text'}
            </p>
          </div>
        ) : (
          <MediaThumbnail
            src={cover}
            alt={post.title || 'Post'}
            showPlayIcon={isVideo}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              transition: 'transform 600ms cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        )}

        {/* Top-left badges */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          display: 'flex', justifyContent: 'space-between', gap: 8, zIndex: 2,
        }}>
          {post.category && (
            <span className="glass-pill" style={{
              padding: '5px 11px', fontSize: 11, fontWeight: 600,
              color: '#fff',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.20)',
              letterSpacing: '0.02em',
            }}>
              {CATEGORY_LABELS[post.category] || (post.category[0].toUpperCase() + post.category.slice(1))}
            </span>
          )}
          {multi && (
            <span className="glass-pill" style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#fff',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.20)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginLeft: 'auto',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zM20 16H8V4h12v12zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>
              </svg>
              <span className="nums">{multi.length}</span>
            </span>
          )}
        </div>

        {/* Bottom info — only on hover or always for text/long-card */}
        {(post.title || desc) && !isTextPost && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '36px 16px 14px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.40) 60%, transparent 100%)',
            color: '#fff',
            zIndex: 2,
          }}>
            {post.title && (
              <h3 style={{
                fontSize: 15.5, fontWeight: 700, lineHeight: 1.25,
                letterSpacing: '-0.01em',
                marginBottom: 4,
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}>{post.title}</h3>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              fontSize: 11.5, opacity: 0.85, fontWeight: 500,
            }}>
              <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{formatDate(post.created_at)}</span>
              {post.hashtags?.length > 0 && (
                <span style={{
                  padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  fontSize: 10.5, fontWeight: 600,
                }}>
                  #{post.hashtags[0].replace(/^#/, '')}
                  {post.hashtags.length > 1 && ` +${post.hashtags.length - 1}`}
                </span>
              )}
            </div>
          </div>
        )}
      </article>
    )
  }

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridAutoRows: '180px',
        gap: 16,
      }}>
        {BENTO_PATTERN.map((slot, i) => (
          <div key={i} className="shimmer" style={{
            gridColumn: slot.c, gridRow: slot.r,
            borderRadius: 24,
          }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <p className="text-body">{error}</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="card-glass" style={{ textAlign: 'center', padding: '64px 28px' }}>
        {searchQuery ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 className="text-section-title" style={{ marginBottom: 8 }}>Nu s-au găsit rezultate</h3>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>
              Nicio postare nu se potrivește cu căutarea pentru &ldquo;{searchQuery}&rdquo;.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <h3 className="text-section-title" style={{ marginBottom: 8 }}>Împărtășiți prima amintire</h3>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>
              Apăsați butonul de upload din dreapta-jos pentru a începe.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="bento-masonry" style={{
      display: 'grid',
      gap: 16,
    }}>
      {posts.map(renderCard)}

      <style jsx global>{`
        .bento-masonry {
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: 180px;
          grid-auto-flow: dense;
        }
        @media (max-width: 1280px) {
          .bento-masonry { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 200px; }
        }
        @media (max-width: 900px) {
          .bento-masonry { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 180px; gap: 12px; }
        }
        @media (max-width: 540px) {
          .bento-masonry { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 140px; gap: 10px; }
          .bento-masonry > article { grid-column: span 1 !important; grid-row: span 1 !important; }
          .bento-masonry > article:nth-child(7n+1) { grid-column: span 2 !important; grid-row: span 2 !important; }
        }
      `}</style>
    </div>
  )
}
