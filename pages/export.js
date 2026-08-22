// Export Timeline to PDF / Book (Legacy). Dependency-free: renders a clean,
// print-optimized layout of the family's timeline and uses the browser's
// "Save as PDF" via window.print(). No server-side PDF library needed.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, authenticatedFetch } from '../lib/pinAuth'
import { useTier } from '../hooks/useTier'
import { useLanguage, localeOf } from '../contexts/LanguageContext'
import FeatureGate from '../components/FeatureGate'
import { detectFileTypeFromUrl, documentMeta } from '../lib/fileTypes'

export default function ExportTimeline() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const { has } = useTier()
  const { t, language } = useLanguage()

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
  }, [router])

  useEffect(() => {
    const run = async () => {
      if (!session?.familyId) return
      try {
        const res = await authenticatedFetch(`/api/photos/list?familyId=${session.familyId}&sort=oldest`)
        const data = await res.json()
        setPosts(res.ok && data.success ? data.photos : [])
      } catch { setPosts([]) } finally { setLoading(false) }
    }
    run()
  }, [session])

  if (!session) return null

  const fmt = (s) => { try { return new Date(s).toLocaleDateString(localeOf(language), { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return '' } }

  return (
    <FeatureGate feature="pdfExport" title={t('exportGateTitle')}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Toolbar — hidden when printing */}
        <div className="export-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/dashboard')} className="btn-glass" style={{ padding: '9px 16px' }}>← {t('back')}</button>
          <button onClick={() => window.print()} className="btn-iris sheen" style={{ padding: '10px 20px', fontWeight: 600 }}>
            🖨️ {t('exportSaveAsPdf')}
          </button>
        </div>

        {/* Cover */}
        <div style={{ textAlign: 'center', padding: '40px 0 30px', borderBottom: '2px solid #eee', marginBottom: 30 }}>
          <h1 style={{ fontSize: 38, margin: '0 0 8px' }}>{session.familyName}</h1>
          <p style={{ color: '#777', margin: 0 }}>{t('exportCoverSubtitle')}</p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#888' }}>{t('exportLoading')}</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>{t('exportEmpty')}</p>
        ) : (
          posts.map((post) => {
            const url = post.file_url || (Array.isArray(post.file_urls) ? post.file_urls[0] : null)
            const kind = post.file_type || post.type || detectFileTypeFromUrl(url)
            const isImg = kind === 'image' && url
            return (
              <article key={post.id} style={{ pageBreakInside: 'avoid', marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{fmt(post.created_at)}</div>
                {post.title && <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{post.title}</h3>}
                {isImg && (
                  <img src={url} alt={post.title || ''} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 10 }} />
                )}
                {!isImg && url && kind !== 'text' && (
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    {kind === 'video' ? `🎬 ${t('exportVideoLabel')}` : kind === 'audio' ? `🎧 ${t('exportAudioLabel')}` : `${documentMeta(url).icon} ${documentMeta(url).name}`}
                  </div>
                )}
                {post.description && <p style={{ margin: 0, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>{post.description}</p>}
              </article>
            )
          })
        )}
      </div>

      <style jsx global>{`
        @media print {
          .export-toolbar { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </FeatureGate>
  )
}
