import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function HeaderIsland({ 
  childName = "Child", 
  albumTitle = "Family Album",
  postCount = 0, 
  onCreatePost,
  onPhotoUpload, 
  onVideoUpload,
  onProfilePictureClick,
  hasEditorAccess = false,
  childImage = "/api/placeholder/80/80",
  searchQuery = "",
  onSearchChange
}) {
  const [postText, setPostText] = useState('')
  const [category, setCategory] = useState('memories')
  const [hashtags, setHashtags] = useState('')
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  const handlePostSubmit = async () => {
    if (!postText.trim()) return
    
    setLoading(true)
    try {
      await onCreatePost({
        text: postText.trim(),
        category,
        hashtags: hashtags.trim()
      })
      
      setPostText('')
      setHashtags('')
      setCategory('memories')
      showSuccess('Postat cu succes!')
    } catch (error) {
      showError('Postarea a eșuat')
    } finally {
      setLoading(false)
    }
  }

  const isTyping = postText.trim().length > 0

  return (
    <div className="main-container">
      {/* Page Title */}
      <div style={{ 
        padding: window.innerWidth <= 768 ? '12px 0 8px 0' : '20px 0 12px 0'
      }}>
        <h1 className="text-page-title" style={{
          fontSize: window.innerWidth <= 768 ? '20px' : '28px',
          marginBottom: '2px'
        }}>
          {albumTitle}
        </h1>
        <p className="text-subtle" style={{ 
          marginTop: '2px',
          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
        }}>
          {postCount} {postCount === 1 ? 'amintire' : 'amintiri'} • Crește în fiecare zi ✨
        </p>
      </div>

      {/* Create Post Component - Simple Clean Bar */}
      {hasEditorAccess && (
        <div className="card" style={{ 
          marginBottom: window.innerWidth <= 768 ? '16px' : '24px',
          padding: window.innerWidth <= 768 ? '12px' : '20px',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* User Avatar - Clickable */}
            <button
              onClick={() => onProfilePictureClick && onProfilePictureClick()}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 0,
                borderRadius: '50%',
                flexShrink: 0,
                transition: 'transform 0.15s ease-in-out'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              title={`Vezi poza de profil a lui ${childName}`}
            >
              <img 
                src={childImage} 
                alt={childName} 
                style={{
                  width: window.innerWidth <= 768 ? '32px' : '40px',
                  height: window.innerWidth <= 768 ? '32px' : '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid var(--border-light)',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=3B82F6&color=white&size=40&rounded=true`
                }}
              />
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={t('shareSpecialMoment')}
              className="input-field"
              style={{ flex: 1 }}
              disabled={loading}
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onPhotoUpload}
                style={{
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-gray)'
                  e.currentTarget.style.color = 'var(--accent-blue)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                title="Încarcă fotografie"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={onVideoUpload}
                style={{
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-gray)'
                  e.currentTarget.style.color = 'var(--accent-blue)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                title="Încarcă video"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m22 8-6 4 6 4V8Z"/>
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded Options - When Typing */}
          {isTyping && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
              {/* Category Pills */}
              <div style={{ marginBottom: '16px' }}>
                <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>Categorie</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    {key: 'memories', label: 'Amintiri'},
                    {key: 'milestones', label: 'Etape importante'},
                    {key: 'everyday', label: 'Zilnic'},
                    {key: 'special', label: 'Special'},
                    {key: 'family', label: 'Familie'},
                    {key: 'play', label: 'Joacă'},
                    {key: 'learning', label: 'Învățare'}
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`category-pill ${category === cat.key ? 'category-pill--selected' : 'category-pill--unselected'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtags Input */}
              <div style={{ marginBottom: '16px' }}>
                <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>Etichete</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#familie #dragoste #creștere #amintiri"
                  className="input-field"
                  disabled={loading}
                />
              </div>

              {/* Share Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handlePostSubmit}
                  disabled={loading || !postText.trim()}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Postez...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 3 3 9-3 9 19-9Z"/>
                        <path d="m6 12 15-3"/>
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
      
      {/* Search Bar for Regular Users */}
      {!hasEditorAccess && onSearchChange && (
        <div className="card" style={{ 
          marginBottom: window.innerWidth <= 768 ? '16px' : '24px',
          padding: window.innerWidth <= 768 ? '10px' : '16px'
        }}>
          <div style={{ position: 'relative' }}>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
                zIndex: 1
              }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Caută în amintiri..."
              className="input-field"
              style={{
                paddingLeft: '42px',
                borderRadius: '18px',
                width: '100%'
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              name="search-posts"
              id="search-posts"
            />
          </div>
        </div>
      )}

      {/* Welcome Message for viewers without search */}
      {!hasEditorAccess && !onSearchChange && (
        <div className="card" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👶</div>
          <h3 className="text-section-title" style={{ marginBottom: '8px' }}>Bun venit în {albumTitle}!</h3>
          <p className="text-body">
            Vizionați amintiri prețioase. Pentru a adăuga fotografii noi și a crea postări, folosiți PIN-ul de editor când vă conectați.
          </p>
        </div>
      )}
    </div>
  )
}