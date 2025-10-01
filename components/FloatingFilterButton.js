import { useState, useEffect } from 'react'
import FilterIsland from './FilterIsland'

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

  return (
    <>
      {/* Floating Filter Button */}
      {showButton && (
        <button
          onClick={() => setShowModal(true)}
          className="floating-button"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 40,
            width: isMobile ? '48px' : '56px',
            height: isMobile ? '48px' : '56px',
            padding: '0',
            background: hasActiveFilters ? 'var(--accent-blue)' : 'white',
            color: hasActiveFilters ? 'white' : 'var(--text-primary)',
            border: hasActiveFilters ? 'none' : '1px solid var(--border-light)',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            boxShadow: isMobile ? '0 4px 12px rgba(0, 0, 0, 0.12)' : '0 8px 25px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(0)',
            animation: showButton ? 'slideUpFloat 0.3s ease-out' : 'none',
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
          onMouseOver={(e) => {
            if (!hasActiveFilters) {
              e.target.style.background = 'var(--bg-gray)'
            }
            e.target.style.transform = 'translateY(-2px) scale(1.05)'
            e.target.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.2)'
          }}
          onMouseOut={(e) => {
            if (!hasActiveFilters) {
              e.target.style.background = 'white'
            } else {
              e.target.style.background = 'var(--accent-blue)'
            }
            e.target.style.transform = 'translateY(0) scale(1)'
            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
          </svg>
          {hasActiveFilters && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white'
            }}></div>
          )}
        </button>
      )}

      {/* Filter Modal */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '20px',
            overflow: 'hidden',
            overscrollBehavior: 'none'
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: isMobile ? '24px 24px 0 0' : '24px',
              padding: '0',
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              maxHeight: isMobile ? '90vh' : '80vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: isMobile ? 'slideUpModal 0.3s ease-out' : 'fadeIn 0.3s ease-out',
              transform: isMobile ? 'translateY(0)' : 'none',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Filtre
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s ease-in-out',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--bg-gray)'
                  e.target.style.color = 'var(--text-primary)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = 'var(--text-secondary)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m18 6-12 12"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            {/* Filter Content */}
            <div style={{ 
              padding: isMobile ? '16px' : '24px', 
              maxHeight: isMobile ? '75vh' : '70vh', 
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}>
              {/* Date Filter */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Filtru după dată
                </label>
                <input
                  type="date"
                  value={filters.date || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    date: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    fontSize: '14px',
                    background: 'var(--bg-gray)',
                    color: 'var(--text-primary)'
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                  margin: '4px 0 0 0'
                }}>
                  Arată postări din 5 zile înainte și după
                </p>
              </div>

              {/* Category Filter */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>
                  Categorie
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: '8px',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  {[
                    { value: 'all', label: 'Toate' },
                    { value: 'memories', label: 'Amintiri' },
                    { value: 'milestones', label: 'Etape' },
                    { value: 'everyday', label: 'Zilnic' },
                    { value: 'special', label: 'Special' },
                    { value: 'family', label: 'Familie' },
                    { value: 'play', label: 'Joacă' },
                    { value: 'learning', label: 'Învățare' }
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => onFiltersChange({
                        ...filters,
                        category: cat.value
                      })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-light)',
                        background: (filters.category || 'all') === cat.value ? 'var(--accent-blue)' : 'white',
                        color: (filters.category || 'all') === cat.value ? 'white' : 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
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
                  ))}
                </div>
              </div>

              {/* Hashtag Filter */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Hashtag
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={filters.hashtag || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      hashtag: e.target.value.replace('#', '')
                    })}
                    placeholder="familie, vacanță, etc."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '16px',
                      fontSize: '14px',
                      background: 'var(--bg-gray)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                {filters.hashtag && (
                  <div style={{ 
                    marginTop: '8px',
                    overflow: 'hidden',
                    width: '100%'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent-blue)',
                      color: 'white',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: '500',
                      gap: '6px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 'calc(100% - 30px)'
                      }}>
                        #{filters.hashtag}
                      </span>
                      <button
                        onClick={() => onFiltersChange({...filters, hashtag: ''})}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1,
                          flexShrink: 0
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* Sort Filter */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Sortare
                </label>
                <select
                  value={filters.sort || 'newest'}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    sort: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    fontSize: '14px',
                    background: 'var(--bg-gray)',
                    color: 'var(--text-primary)',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                    backgroundPosition: 'right 12px center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '3rem'
                  }}
                >
                  <option value="newest">Cel mai nou</option>
                  <option value="oldest">Cel mai vechi</option>
                  <option value="title_asc">Titlu A-Z</option>
                  <option value="title_desc">Titlu Z-A</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-light)'
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
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#fee2e2'
                    e.target.style.borderColor = '#fca5a5'
                    e.target.style.color = '#dc2626'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent'
                    e.target.style.borderColor = 'var(--border-light)'
                    e.target.style.color = 'var(--text-secondary)'
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