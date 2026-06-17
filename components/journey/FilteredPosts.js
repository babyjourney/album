// A self-contained grid of posts fetched from /api/photos/list with arbitrary
// filter params (age window, category/hashtag "any" lists, etc.). Reused by the
// Journey tabs (age timelines, Health, Education). Clicking a post opens the
// shared PostModal in read-only mode.

import { useState, useEffect } from 'react'
import { authenticatedFetch } from '../../lib/pinAuth'
import { detectFileTypeFromUrl } from '../../lib/fileTypes'
import MediaThumbnail from '../MediaThumbnail'
import MediaTypeCard from '../MediaTypeCard'
import PostModal from '../PostModal'

export default function FilteredPosts({ familyId, childId, params = {}, emptyText = 'Nicio postare aici încă.' }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!familyId) return
      setLoading(true)
      try {
        const qs = new URLSearchParams({ familyId })
        if (childId) qs.append('childId', childId)
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') qs.append(k, v)
        })
        const res = await authenticatedFetch(`/api/photos/list?${qs.toString()}`)
        const data = await res.json()
        if (!cancelled) setPosts(res.ok && data.success ? (data.photos || []) : [])
      } catch {
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, childId, JSON.stringify(params)])

  if (loading) {
    return <div className="text-subtle" style={{ padding: 20, textAlign: 'center' }}>Se încarcă…</div>
  }
  if (!posts.length) {
    return <div className="text-subtle" style={{ padding: 20, textAlign: 'center' }}>{emptyText}</div>
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}>
        {posts.map((post, i) => {
          const cover = post.file_url || (Array.isArray(post.file_urls) ? post.file_urls[0] : null)
          const kind = post.file_type || post.type || detectFileTypeFromUrl(cover)
          const isText = post.type === 'text'
          const isAudio = kind === 'audio'
          const isDoc = kind === 'document'
          return (
            <button
              key={post.id}
              onClick={() => { setSelected(post); setIndex(i) }}
              style={{
                position: 'relative', aspectRatio: '1/1', borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer', padding: 0,
                border: '1px solid var(--glass-hairline)', background: 'var(--glass-1)',
              }}
            >
              {isText ? (
                <div style={{
                  position: 'absolute', inset: 0, padding: 12,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', textAlign: 'center', overflow: 'hidden',
                }}>
                  {(post.description || post.title || 'Text').slice(0, 80)}
                </div>
              ) : (isAudio || isDoc) ? (
                <MediaTypeCard kind={isAudio ? 'audio' : 'document'} url={cover} title={post.title} />
              ) : (
                <MediaThumbnail
                  src={cover}
                  alt={post.title || 'Post'}
                  showPlayIcon={kind === 'video'}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <PostModal
          selectedPost={selected}
          allPosts={posts}
          currentIndex={index}
          onClose={() => setSelected(null)}
          onNavigate={(dir) => {
            const next = index + dir
            if (next >= 0 && next < posts.length) {
              setIndex(next); setSelected(posts[next])
            }
          }}
          readOnly={true}
        />
      )}
    </>
  )
}
