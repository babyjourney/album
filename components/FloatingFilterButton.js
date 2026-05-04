import { useState, useEffect } from 'react'
import FilterIsland from './FilterIsland'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  marginBottom: '10px'
}

export default function FloatingFilterButton({ filters, onFiltersChange }) {
  const [showButton, setShowButton] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (showModal) {
      const originalOverflow = document.body.style.overflow
      const originalPosition = document.body.style.position
      const originalWidth = document.body.style.width

      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.position = originalPosition
        document.body.style.width = originalWidth
      }
    }
  }, [showModal])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setShowButton(scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const hasActiveFilters = filters.category !== 'all' || filters.hashtag || filters.date

  const sortOptions = [
    { value: 'newest', label: 'Cel mai nou' },
    { value: 'oldest', label: 'Cel mai vechi' },
    { value: 'title_asc', label: 'Titlu A-Z' },
    { value: 'title_desc', label: 'Titlu Z-A' }
  ]

  const categories = [
    { value: 'all', label: 'Toate' },
    { value: 'memories', label: 'Amintiri' },
    { value: 'milestones', label: 'Etape' },
    { value: 'everyday', label: 'Zilnic' },
    { value: 'special', label: 'Special' },
    { value: 'family', label: 'Familie' },
    { value: 'play', label: 'Joacă' },
    { value: 'learning', label: 'Învățare' }
  ]

  return (
    <>
      {showButton && (
        <button
          onClick={() => setShowModal(true)}
          className="floating-button filter-button-container"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            width: isMobile ? '52px' : '56px',
            height: isMobile ? '52px' : '56px',
            padding: '0',
            borderRadius: '50%',
            cursor: 'pointer',
            color: hasActiveFilters ? 'var(--accent-iris)' : 'var(--ink-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
          </svg>
          {hasActiveFilters && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '10px',
              height: '10px',
              background: 'var(--accent-iris)',
              borderRadius: '50%',
              boxShadow: '0 0 0 2px var(--canvas), 0 0 12px rgba(124, 58, 237, 0.55)'
            }}></div>
          )}
        </button>
      )}

      {showModal && (
        <div
          className="modal-scrim"
          style={{
            zIndex: 15,
            alignItems: isMobile ? 'flex-end' : 'center',
            padding: isMobile ? 0 : '24px',
            overflow: 'hidden',
            overscrollBehavior: 'none'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-glass"
            style={{
              alignSelf: isMobile ? 'flex-end' : 'center',
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              borderRadius: isMobile ? '28px 28px 0 0' : '28px',
              maxHeight: isMobile ? '85vh' : '80vh',
              overflow: 'hidden',
              position: 'relative',
              padding: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: 'var(--glass-hairline-strong)',
                margin: '12px auto 0'
              }} />
            )}

            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--glass-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 className="text-section-title" style={{ margin: 0 }}>
                Filtre
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-icon"
                style={{
                  width: 40,
                  height: 40,
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  outline: 'none'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 6-12 12"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div style={{
              padding: isMobile ? '16px 20px' : '24px',
              maxHeight: isMobile ? '70vh' : '70vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}>
              <div style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>
                  Filtru după dată
                </label>
                <input
                  type="date"
                  className="input-glass"
                  value={filters.date || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    date: e.target.value
                  })}
                />
                <p className="text-tertiary" style={{
                  fontSize: '12px',
                  marginTop: '8px',
                  margin: '8px 0 0 0'
                }}>
                  Arată postări din 5 zile înainte și după
                </p>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>
                  Categorie
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  width: '100%'
                }}>
                  {categories.map((cat) => {
                    const selected = (filters.category || 'all') === cat.value
                    return (
                      <button
                        key={cat.value}
                        onClick={() => onFiltersChange({
                          ...filters,
                          category: cat.value
                        })}
                        className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          outline: 'none',
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>
                  Hashtag
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-glass"
                    value={filters.hashtag || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/#/g, '')
                      onFiltersChange({
                        ...filters,
                        hashtag: value
                      })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        const value = e.target.value.trim()
                        if (value) {
                          const hashtags = value.split(/\s+/).filter(tag => tag.length > 0)
                          onFiltersChange({
                            ...filters,
                            hashtag: hashtags.join(' ')
                          })
                        }
                      }
                    }}
                    placeholder="familie vacanță plajă (space pentru multiple)"
                    style={{ flex: 1 }}
                  />
                </div>
                {filters.hashtag && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    width: '100%'
                  }}>
                    {filters.hashtag.split(/\s+/).filter(tag => tag.length > 0).map((hashtag, index) => (
                      <span key={index} className="category-pill--selected" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 6px 6px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        gap: '6px',
                        border: '1px solid rgba(255,255,255,0.20)'
                      }}>
                        <span>{hashtag.startsWith('#') ? hashtag : `#${hashtag}`}</span>
                        <button
                          onClick={() => {
                            const remainingTags = filters.hashtag.split(/\s+/)
                              .filter(tag => tag.length > 0 && tag !== hashtag)
                              .join(' ')
                            onFiltersChange({...filters, hashtag: remainingTags})
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.18)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            lineHeight: 1,
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => onFiltersChange({...filters, hashtag: ''})}
                      className="btn-ghost"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: 'var(--accent-red)',
                        borderRadius: '999px'
                      }}
                    >
                      Curăță toate
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>
                  Sortare
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {sortOptions.map((opt) => {
                    const selected = (filters.sort || 'newest') === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onFiltersChange({
                          ...filters,
                          sort: opt.value
                        })}
                        className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          outline: 'none',
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '18px',
                borderTop: '1px solid var(--glass-hairline)'
              }}>
                <button
                  onClick={() => {
                    onFiltersChange({
                      date: '',
                      category: 'all',
                      hashtag: '',
                      sort: 'newest'
                    })
                  }}
                  className="btn-ghost"
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: hasActiveFilters ? 'var(--accent-red)' : 'var(--ink-2)',
                    border: '1px solid var(--glass-hairline)',
                    borderRadius: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                >
                  Curăță toate filtrele
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
