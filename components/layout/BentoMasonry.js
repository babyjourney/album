import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { authenticatedFetch } from '../../lib/pinAuth'
import MediaThumbnail from '../MediaThumbnail'
import MediaTypeCard from '../MediaTypeCard'
import { detectFileTypeFromUrl } from '../../lib/fileTypes'
import { getCoverPoster } from '../../lib/posters'
import { categoryLabel } from '../../lib/defaultCategories'

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

// Bento sizing patterns — one entry per card position, repeating.
// Pattern is selected based on column count.
const BENTO_PATTERN_3 = [
  { c: 'span 2', r: 'span 2' },  // hero
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 2' },  // tall
  { c: 'span 2', r: 'span 1' },  // wide
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
]

const BENTO_PATTERN_2 = [
  { c: 'span 2', r: 'span 2' },  // hero (full width)
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
  { c: 'span 1', r: 'span 1' },
]

export default function BentoMasonry({ familyId, searchQuery, refreshTrigger, onPostClick, onPostCountUpdate, onPostsLoaded, onHashtagClick, filters, selectedChildId, columns = 2 }) {
  const safeColumns = columns === 3 ? 3 : 2
  const BENTO_PATTERN = safeColumns === 3 ? BENTO_PATTERN_3 : BENTO_PATTERN_2
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showError } = useToast()
  const { language, t } = useLanguage()

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
        // The API anchors on this date: 3 posts before, the whole day, 3 after.
        // tzOffset lets the server work out which UTC instants make up *your*
        // calendar day — otherwise a post made just after midnight lands on the
        // previous day server-side.
        if (filters.date) {
          params.append('dateAnchor', filters.date)
          params.append('tzOffset', String(new Date().getTimezoneOffset()))
        }
        if (filters.sort) params.append('sort', filters.sort)
      }
      if (selectedChildId) params.append('childId', selectedChildId)

      const response = await authenticatedFetch(`/api/photos/list?${params.toString()}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('postsLoadFailed'))
      const data = result.photos || []
      setPosts(data)
      onPostCountUpdate && onPostCountUpdate(data.length)
      onPostsLoaded && onPostsLoaded(data)
    } catch (e) {
      console.error('Error fetching posts:', e)
      const msg = t('postsLoadFailed')
      setError(msg); showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (s) => new Date(s).toLocaleDateString(
    language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'ro-RO',
    { month: 'short', day: 'numeric', year: 'numeric' }
  )

  const renderCard = (post, index) => {
    const isTextPost = post.type === 'text'
    const isVideo = post.file_type === 'video' || post.type === 'video'
    const cover = getCoverUrl(post)
    const coverKind = detectFileTypeFromUrl(cover)
    const isAudio = post.file_type === 'audio' || post.type === 'audio' || coverKind === 'audio'
    const isDocument = post.file_type === 'document' || post.type === 'document' || coverKind === 'document'
    const multi = getMultiPhotoUrls(post)
    const desc = getCleanDescription(post)
    const slot = BENTO_PATTERN[index % BENTO_PATTERN.length]

    return (
      <article
        key={post.id}
        id={`post-${post.id}`}
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
          <div className="bento-text-card" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', overflow: 'hidden',
          }}>
            <div aria-hidden style={{
              position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '160%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            {/* Font size and clamp are set in CSS so they can shrink with the
                card. A fixed 18px in a 140px-tall phone tile rendered ~3 lines
                and clipped the rest at both ends (item 15).
                whiteSpace: pre-wrap keeps the author's line breaks (item 4). */}
            <p className="bento-text-body" style={{
              position: 'relative', zIndex: 1,
              color: '#fff', fontWeight: 500,
              textShadow: '0 1px 6px rgba(0,0,0,0.20)',
              maxWidth: 320,
              fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
              letterSpacing: '-0.01em',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
            }}>
              {desc || t('textPostFallback')}
            </p>
          </div>
        ) : (isAudio || isDocument) ? (
          <MediaTypeCard kind={isAudio ? 'audio' : 'document'} url={cover} title={post.title} />
        ) : (
          <MediaThumbnail
            src={cover}
            poster={getCoverPoster(post)}
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
          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {post.category && (
              <span className="glass-pill card-category-pill" style={{
                padding: '5px 11px', fontSize: 11, fontWeight: 600,
                color: '#fff',
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.20)',
                letterSpacing: '0.02em',
              }}>
                {categoryLabel(post.category)}
              </span>
            )}
            {post.is_private && (
              <span
                className="glass-pill"
                title={t('privateContentTooltip')}
                aria-label={t('privateContentAria')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#fff',
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
                {t('privateBadge')}
              </span>
            )}
          </div>
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
          <div className="card-bottom-info" style={{
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
      <div className={`bento-masonry bento-cols-${safeColumns}`} style={{ display: 'grid', gap: 16 }}>
        {BENTO_PATTERN.map((slot, i) => (
          <div key={i} className="shimmer" style={{
            gridColumn: slot.c, gridRow: slot.r,
            borderRadius: 24,
          }} />
        ))}
        <BentoStyles />
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
            <h3 className="text-section-title" style={{ marginBottom: 8 }}>{t('noResultsFound')}</h3>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>
              {t('noResultsForQuery', { query: searchQuery })}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <h3 className="text-section-title" style={{ marginBottom: 8 }}>{t('shareFirstMemory')}</h3>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>
              {t('shareFirstMemoryHint')}
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`bento-masonry bento-cols-${safeColumns}`} style={{
      display: 'grid',
      gap: 16,
    }}>
      {posts.map(renderCard)}
      <BentoStyles />
    </div>
  )
}

function BentoStyles() {
  return (
    <style jsx global>{`
      .bento-masonry {
        grid-auto-flow: dense;
      }

      /* Text-post cards (item 15). The tile shrinks a lot on phones, so the
         type has to shrink with it and clamp instead of overflowing. */
      .bento-masonry .bento-text-card { padding: 28px; }
      .bento-masonry .bento-text-body {
        font-size: 18px;
        line-height: 1.4;
        -webkit-line-clamp: 7;
      }
      @media (max-width: 900px) {
        .bento-masonry .bento-text-card { padding: 16px; }
        .bento-masonry .bento-text-body {
          font-size: 14px;
          line-height: 1.4;
          -webkit-line-clamp: 6;
        }
      }
      @media (max-width: 540px) {
        .bento-masonry .bento-text-card { padding: 10px; }
        .bento-masonry .bento-text-body {
          font-size: 11.5px;
          line-height: 1.35;
          -webkit-line-clamp: 6;
        }
        /* The 7n+1 tile is the 2x2 hero — it has room for more. */
        .bento-masonry > article:nth-child(7n+1) .bento-text-card { padding: 20px; }
        .bento-masonry > article:nth-child(7n+1) .bento-text-body {
          font-size: 15px;
          -webkit-line-clamp: 9;
        }
      }
      .bento-masonry.bento-cols-2 {
        grid-template-columns: repeat(2, 1fr);
        grid-auto-rows: auto;
      }
      .bento-masonry.bento-cols-3 {
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: auto;
      }
      /* Desktop (item 4): a clean uniform 1:1 grid, 3 (or 2) per row. We drop
         the bento row/column spans here so aspect-ratio can't fight a 2x1/1x2
         span (which caused overflow). Mobile rules below (<=900px / <=540px)
         keep the original hero + 2-per-row look untouched. */
      @media (min-width: 901px) {
        .bento-masonry > article {
          grid-column: span 1 !important;
          grid-row: span 1 !important;
          aspect-ratio: 1 / 1;
        }
      }
      @media (max-width: 900px) {
        .bento-masonry.bento-cols-2,
        .bento-masonry.bento-cols-3 {
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 180px;
          gap: 12px;
        }
        .bento-masonry.bento-cols-3 > article { grid-column: span 1 !important; grid-row: span 1 !important; }
        .bento-masonry.bento-cols-3 > article:nth-child(7n+1) { grid-column: span 2 !important; grid-row: span 2 !important; }
      }
      @media (max-width: 540px) {
        .bento-masonry.bento-cols-2,
        .bento-masonry.bento-cols-3 {
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 140px;
          gap: 10px;
        }
        .bento-masonry > article { grid-column: span 1 !important; grid-row: span 1 !important; }
        .bento-masonry > article:nth-child(7n+1) { grid-column: span 2 !important; grid-row: span 2 !important; }
        .bento-masonry .card-category-pill { display: none !important; }
        .bento-masonry .card-bottom-info { display: none !important; }
      }
    `}</style>
  )
}
