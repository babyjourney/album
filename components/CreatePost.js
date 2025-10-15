import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'

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
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
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
    <div className="post-card card-padding">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            value={postText}
            onChange={handleTextChange}
            className="input text-lg"
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
          />
        </div>
        
        {/* Category and Hashtags Selection */}
        {isTyping && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block body-small font-medium text-gray-700 mb-2">
                {t('category')}
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`filter-pill ${
                      category === cat.value ? 'filter-pill-active' : 'filter-pill-inactive'
                    }`}
                  >
                    <span className="mr-1">{cat.emoji}</span>
                    {cat.label.replace(cat.emoji + ' ', '')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="hashtags" className="block body-small font-medium text-gray-700 mb-2">
                {t('hashtag')}
              </label>
              <div style={{
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                padding: '8px 12px',
                backgroundColor: 'white',
                minHeight: '40px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px'
              }}>
                {/* Display hashtag pills */}
                {hashtags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: 'var(--accent-blue)',
                      color: 'white',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '400',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      lineHeight: '1.2',
                      height: 'auto',
                      minHeight: 'unset',
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    #{tag}
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
                    backgroundColor: 'transparent'
                  }}
                />
              </div>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
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
          <div className="toast toast-error mb-4 relative">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Media buttons - shown when not typing */}
          {!isTyping && (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onPhotoClick}
                className="btn btn-ghost flex items-center space-x-2 px-4 py-2"
              >
                <span className="text-lg">📷</span>
                <span className="body-small font-medium">{t('uploadPhoto')}</span>
              </button>
              
              <button
                type="button"
                onClick={onVideoClick}
                className="btn btn-ghost flex items-center space-x-2 px-4 py-2"
              >
                <span className="text-lg">🎥</span>
                <span className="body-small font-medium">Video</span>
              </button>
            </div>
          )}

          {/* Post button - shown when typing */}
          {isTyping && (
            <div className="flex-1 flex justify-end">
              <button
                type="submit"
                disabled={loading || !postText.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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