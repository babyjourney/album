import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'
import { authenticatedFetch } from '../lib/pinAuth'

export default function CreatePost({ familyId, onPostSuccess, onPhotoClick, onVideoClick }) {
  const [postText, setPostText] = useState('')
  const [category, setCategory] = useState('memories')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hashtags, setHashtags] = useState([])
  const [currentHashtagInput, setCurrentHashtagInput] = useState('')
  const [customDate, setCustomDate] = useState(null)
  const [categories, setCategories] = useState([])
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  // Load categories on mount
  useEffect(() => {
    setCategories(getCategories())
  }, [])

  const handleTextChange = (e) => {
    setPostText(e.target.value)
    setError('')
  }

  // Handle hashtag input
  const handleHashtagKeyDown = (e) => {
    if (e.key === ' ' && currentHashtagInput.trim()) {
      e.preventDefault()
      const newTag = currentHashtagInput.trim().toLowerCase()
      if (!hashtags.includes(newTag)) {
        setHashtags([...hashtags, newTag])
      }
      setCurrentHashtagInput('')
    } else if (e.key === 'Backspace' && !currentHashtagInput && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1))
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!postText.trim()) {
      setError(t('postDescription'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await authenticatedFetch('/api/posts/create', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          title: '', // Text posts don't need titles
          description: postText.trim(),
          fileUrl: null,
          category: category,
          hashtags: hashtags.map(tag => `#${tag}`).join(' '),
          customDate
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('postCreationFailed'))
      }

      // Reset form
      setPostText('')
      setCategory('memories')
      setHashtags([])
      setCurrentHashtagInput('')

      // Show success toast
      showSuccess(t('success'))

      // Notify parent component
      if (onPostSuccess) {
        onPostSuccess()
      }

    } catch (error) {
      console.error('Error creating text post:', error)
      const errorMessage = t('postCreationFailedRetry')
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isTyping = postText.trim().length > 0

  return (
    <div
      className="card-glass"
      style={{
        padding: '20px',
        borderRadius: '24px'
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={postText}
            onChange={handleTextChange}
            className="input-glass"
            rows="3"
            placeholder={t('addDescription')}
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            name="post-text"
            id="post-text"
            style={{
              width: '100%',
              fontSize: '16px',
              lineHeight: 1.5,
              resize: 'vertical',
              minHeight: '88px',
              borderRadius: '16px'
            }}
          />
        </div>

        {/* Category and Hashtags Selection */}
        {isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label
                className="text-eyebrow"
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  color: 'var(--ink-2)'
                }}
              >
                {t('category')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`category-pill ${category === cat.value ? 'category-pill--selected' : ''}`}
                  >
                    <span style={{ marginRight: '6px' }}>{cat.emoji}</span>
                    {cat.label.replace(cat.emoji + ' ', '')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="hashtags"
                className="text-eyebrow"
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  color: 'var(--ink-2)'
                }}
              >
                {t('hashtag')}
              </label>
              <div
                className="input-glass"
                style={{
                  padding: '10px 14px',
                  minHeight: '48px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '14px'
                }}
              >
                {/* Display hashtag pills */}
                {hashtags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-iris), #6366f1)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}

                {/* Input for new hashtags */}
                <input
                  type="text"
                  value={currentHashtagInput}
                  onChange={(e) => setCurrentHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder={hashtags.length === 0 ? t('hashtagInputPlaceholder') : ""}
                  disabled={loading}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  name="post-hashtags"
                  id="post-hashtags"
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    minWidth: '120px',
                    padding: '4px 0',
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    color: 'var(--ink-1)'
                  }}
                />
              </div>
              <p className="text-tertiary" style={{ marginTop: '6px', fontSize: '12px' }}>
                {t('hashtagInputHelp')}
              </p>
            </div>

            {/* Date Picker */}
            <div>
              <DatePicker
                value={customDate}
                onChange={setCustomDate}
                label={t('postDate')}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.10)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--accent-red)',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Media buttons - shown when not typing */}
          {!isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onPhotoClick}
                className="btn-glass"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '14px'
                }}
              >
                <span style={{ fontSize: '16px' }}>📷</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('uploadPhoto')}</span>
              </button>

              <button
                type="button"
                onClick={onVideoClick}
                className="btn-glass"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '14px'
                }}
              >
                <span style={{ fontSize: '16px' }}>🎥</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Video</span>
              </button>
            </div>
          )}

          {/* Post button - shown when typing */}
          {isTyping && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={loading || !postText.trim()}
                className="btn-iris sheen"
                style={{
                  padding: '10px 22px',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: (loading || !postText.trim()) ? 0.55 : 1,
                  cursor: (loading || !postText.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? t('uploading') : t('createPost')}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
