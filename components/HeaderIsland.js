import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getCategories } from '../lib/categoriesData'

export default function HeaderIsland({
  childName = 'Child',
  albumTitle = 'Family Album',
  postCount = 0,
  onCreatePost,
  onPhotoUpload,
  onVideoUpload,
  onProfilePictureClick,
  hasEditorAccess = false,
  childImage = '/api/placeholder/80/80',
  searchQuery = '',
  onSearchChange,
}) {
  const [postText, setPostText] = useState('')
  const [category, setCategory] = useState('memories')
  const [hashtags, setHashtags] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([
        { value: 'memories',   label: 'Amintiri' },
        { value: 'milestones', label: 'Etape importante' },
        { value: 'everyday',   label: 'Zilnic' },
        { value: 'special',    label: 'Special' },
        { value: 'family',     label: 'Familie' },
        { value: 'play',       label: 'Joacă' },
        { value: 'learning',   label: 'Învățare' },
      ]))
  }, [])

  const handlePostSubmit = async () => {
    if (!postText.trim()) return
    setLoading(true)
    try {
      await onCreatePost({ text: postText.trim(), category, hashtags: hashtags.trim() })
      setPostText(''); setHashtags(''); setCategory('memories')
      showSuccess('Postat cu succes!')
    } catch {
      showError('Postarea a eșuat')
    } finally {
      setLoading(false)
    }
  }

  const isTyping = postText.trim().length > 0

  return (
    <div className="main-container">
      {/* Title block */}
      <div style={{ padding: '24px 0 16px' }}>
        <h1 className="text-page-title">{albumTitle}</h1>
        <p className="text-subtle" style={{ marginTop: 4 }}>
          <span className="nums">{postCount}</span> {postCount === 1 ? 'amintire' : 'amintiri'}
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <span style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>
            Crește în fiecare zi
          </span>
        </p>
      </div>

      {/* Compose bar (editor) */}
      {hasEditorAccess && (
        <div className="card-glass" style={{ marginBottom: 24, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => onProfilePictureClick && onProfilePictureClick()}
              title={`Vezi poza de profil a lui ${childName}`}
              style={{
                position: 'relative',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: '50%', flexShrink: 0,
                transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <span style={{
                position: 'absolute', inset: -3,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed, #06b6d4)',
                filter: 'blur(0.5px)',
              }} />
              <img
                src={childImage}
                alt={childName}
                style={{
                  position: 'relative',
                  width: 44, height: 44,
                  borderRadius: '50%', objectFit: 'cover',
                  border: '2px solid var(--canvas)',
                  display: 'block',
                }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=7c3aed&color=ffffff&size=88&rounded=true`
                }}
              />
            </button>

            <input
              type="text"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={t('shareSpecialMoment')}
              className="input-glass"
              style={{ flex: 1 }}
              disabled={loading}
            />

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={onPhotoUpload}
                className="btn-icon"
                title="Încarcă fotografie"
                aria-label="Upload photo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="3" ry="3"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={onVideoUpload}
                className="btn-icon"
                title="Încarcă video"
                aria-label="Upload video"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z"/>
                  <rect width="14" height="12" x="2" y="6" rx="3" ry="3"/>
                </svg>
              </button>
            </div>
          </div>

          {isTyping && (
            <div style={{
              marginTop: 16, paddingTop: 16,
              borderTop: '1px solid var(--glass-hairline)',
              animation: 'fadeIn 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}>
              <div style={{ marginBottom: 14 }}>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Categorie
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`category-pill ${category === cat.value ? 'category-pill--selected' : ''}`}
                    >
                      {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Etichete
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#familie #dragoste #creștere #amintiri"
                  className="input-glass"
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handlePostSubmit}
                  disabled={loading || !postText.trim()}
                  className="btn-iris sheen"
                >
                  {loading ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Se postează…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 3 3 9-3 9 19-9Z"/>
                      </svg>
                      Postează
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search bar (viewer) */}
      {!hasEditorAccess && onSearchChange && (
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none', zIndex: 1 }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută în amintiri..."
            className="input-glass"
            style={{ paddingLeft: 46, borderRadius: 18 }}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            data-form-type="other" data-lpignore="true" data-1p-ignore="true" data-bwignore="true"
            name="search-posts" id="search-posts"
          />
        </div>
      )}

      {/* Welcome card (viewer w/o search) */}
      {!hasEditorAccess && !onSearchChange && (
        <div className="card-glass" style={{ marginBottom: 32, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👶</div>
          <h3 className="text-section-title" style={{ marginBottom: 8 }}>Bun venit în {albumTitle}!</h3>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Vizionați amintiri prețioase. Pentru a adăuga fotografii noi și a crea postări, folosiți PIN-ul de editor când vă conectați.
          </p>
        </div>
      )}
    </div>
  )
}
