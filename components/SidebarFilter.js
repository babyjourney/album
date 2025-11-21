import { useState, useEffect, useRef } from 'react'
import { Search, Filter, X, Hash, Settings, Plus } from 'lucide-react'
import FilterIsland from './FilterIsland'
import { useLanguage } from '../contexts/LanguageContext'
import { getCategories, getCategoriesSync } from '../lib/categoriesData'
import CategoryManager from './CategoryManager'
import { useOnClickOutside } from '../hooks/useOnClickOutside'

// Add CSS animations
const animations = `
  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('sidebar-animations')) {
  const style = document.createElement('style')
  style.id = 'sidebar-animations'
  style.textContent = animations
  document.head.appendChild(style)
}

export default function SidebarFilter({ 
  searchQuery, 
  onSearchChange, 
  filters,
  onFiltersChange,
  selectedChildId,
  onCategoryAdded,
  onChildFilterChange
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState([])
  const { t } = useLanguage()
  const sidebarRef = useRef(null)

  // Handle click outside to close desktop sidebar
  useOnClickOutside(sidebarRef, () => setShowDesktopSidebar(false))

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1200
      setIsMobile(mobile)
      if (!mobile) {
        setShowMobileFilters(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories()
        setCategories([{ value: 'all', label: 'Toate', emoji: '📱' }, ...cats])
      } catch (error) {
        console.error('Error loading categories:', error)
        // Fallback to cached/default categories
        setCategories([
          { value: 'all', label: 'Toate', emoji: '📱' },
          { value: 'memories', label: 'Amintiri', emoji: '💭' },
          { value: 'milestones', label: 'Etape', emoji: '🎯' },
          { value: 'everyday', label: 'Zilnic', emoji: '☀️' },
          { value: 'special', label: 'Special', emoji: '✨' }
        ])
      }
    }
    loadCategories()
  }, [])

  const hasActiveFilters = filters.category !== 'all' || filters.hashtag || filters.date

  // Mobile version - floating corner button
  if (isMobile) {
    return (
      <>
        {/* Floating Filter Button */}
        <button
          onClick={() => setShowMobileFilters(true)}
          style={{
            position: 'fixed',
            bottom: '140px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: hasActiveFilters ? 'var(--accent-blue)' : 'var(--bg-secondary)',
            color: hasActiveFilters ? 'white' : 'var(--text-primary)',
            border: hasActiveFilters ? 'none' : '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Filter size={24} />
        </button>

        {/* Mobile Filter Modal */}
        {showMobileFilters && (
          <div 
            onClick={() => setShowMobileFilters(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--overlay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              backdropFilter: 'blur(4px)'
            }}>
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: '16px',
                width: '92%',
                maxWidth: '350px',
                maxHeight: '75vh',
                overflowY: 'auto',
                margin: '16px'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  🔍 Filtre
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={14} 
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Caută în descrieri..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Compact Mobile Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Categories - Most Important First */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px', 
                    display: 'block' 
                  }}>
                    Categorie
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => onFiltersChange({ ...filters, category: cat.value })}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '16px',
                          border: 'none',
                          cursor: 'pointer',
                          background: (filters.category || 'all') === cat.value ? 'var(--accent-blue)' : 'var(--bg-gray)',
                          color: (filters.category || 'all') === cat.value ? 'white' : 'var(--text-primary)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat.emoji && `${cat.emoji} `}{cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px', 
                    display: 'block' 
                  }}>
                    📅 Dată
                  </label>
                  <input
                    type="date"
                    value={filters.date || ''}
                    onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Hashtag Filter */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px', 
                    display: 'block' 
                  }}>
                    # Hashtag
                  </label>
                  <input
                    type="text"
                    value={filters.hashtag || ''}
                    onChange={(e) => onFiltersChange({ ...filters, hashtag: e.target.value })}
                    placeholder="#familie, #vacanță..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Sort */}
                <div>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px', 
                    display: 'block' 
                  }}>
                    ⬆️ Sortare
                  </label>
                  <select
                    value={filters.sort || 'newest'}
                    onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="newest">Cel mai nou</option>
                    <option value="oldest">Cel mai vechi</option>
                    <option value="title_asc">Titlu A-Z</option>
                    <option value="title_desc">Titlu Z-A</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => onFiltersChange({ date: '', category: 'all', hashtag: '', sort: 'newest' })}
                  style={{
                    padding: '10px 16px',
                    background: (filters.category !== 'all' || filters.date || filters.hashtag) ? 'var(--accent-red)' : 'var(--bg-gray)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: (filters.category !== 'all' || filters.date || filters.hashtag) ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  🗑️ Șterge toate filtrele
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop version - collapsible sidebar with toggle button
  return (
    <>
      {/* Desktop Toggle Button */}
      <button
        onClick={() => setShowDesktopSidebar(!showDesktopSidebar)}
        style={{
          position: 'fixed',
          left: showDesktopSidebar ? '300px' : '20px',
          top: '80px',
          width: '48px',
          height: '48px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          cursor: 'pointer',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'var(--bg-gray)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <Filter size={20} color={hasActiveFilters ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
      </button>

      {/* Desktop Sidebar Backdrop */}
      {showDesktopSidebar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            zIndex: 140,
            opacity: 1,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Desktop Sidebar */}
      {showDesktopSidebar && (
        <div 
          ref={sidebarRef}
          style={{
            position: 'fixed',
            left: '10px',
            top: '80px',
            width: '280px',
            height: 'calc(100vh - 120px)',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '12px',
            zIndex: 150,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInLeft 0.3s ease-out'
          }}
        >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)'
          }}>
{t('filtersAndSearch')}
          </h3>
          <Filter size={20} color="var(--accent-blue)" />
        </div>

        {/* Search */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            {t('search')}
          </div>
          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500', 
              color: 'var(--text-secondary)'
            }}>
              {t('categories')}
            </div>
            <button
              onClick={() => setShowCategoryManager(true)}
              style={{
                padding: '6px 10px',
                background: 'var(--bg-gray)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)'
              }}
            >
              <Settings size={14} />
              {t('manage')}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              { value: 'all', label: t('all') },
              ...categories
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => onFiltersChange({ ...filters, category: cat.value })}
                style={{
                  padding: '4px 6px',
                  fontSize: '10px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  background: (filters.category || 'all') === cat.value ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: (filters.category || 'all') === cat.value ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat.emoji && `${cat.emoji} `}{cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {t('data')}
            {filters.date && (
              <button
                onClick={() => onFiltersChange({ ...filters, date: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '2px 4px'
                }}
              >
                ✕
              </button>
            )}
          </div>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '11px',
              outline: 'none',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
          {filters.date && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: 'var(--bg-gray)',
              borderRadius: '6px',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px'
              }}>
                📅 Days around {new Date(filters.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px'
              }}>
                {(() => {
                  const selectedDate = new Date(filters.date)
                  const days = []
                  for (let i = -3; i <= 3; i++) {
                    const date = new Date(selectedDate)
                    date.setDate(selectedDate.getDate() + i)
                    const dateStr = date.toISOString().split('T')[0]
                    const isSelected = i === 0
                    days.push(
                      <button
                        key={i}
                        onClick={() => onFiltersChange({ ...filters, date: dateStr })}
                        style={{
                          padding: '4px 2px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                          color: isSelected ? 'white' : 'var(--text-primary)',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.target.style.background = 'var(--accent-blue-light)'
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.target.style.background = 'var(--bg-secondary)'
                          }
                        }}
                      >
                        <div style={{ fontSize: '8px', opacity: 0.7 }}>
                          {date.toLocaleDateString('en', { weekday: 'narrow' })}
                        </div>
                        <div style={{ fontWeight: isSelected ? '600' : '400' }}>
                          {date.getDate()}
                        </div>
                      </button>
                    )
                  }
                  return days
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Hashtag Filter */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            {t('hashtag')}
          </div>
          <div style={{ position: 'relative' }}>
            <Hash 
              size={16} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={filters.hashtag}
              onChange={(e) => onFiltersChange({ ...filters, hashtag: e.target.value.replace('#', '') })}
              placeholder={t('hashtagPlaceholder')}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '11px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* Sort */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            {t('sorting')}
          </div>
          <select
            value={filters.sort || 'newest'}
            onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '11px',
              outline: 'none',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="newest">{t('newest')}</option>
            <option value="oldest">{t('oldest')}</option>
            <option value="title_asc">{t('titleAZ')}</option>
            <option value="title_desc">{t('titleZA')}</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(filters.category !== 'all' || filters.hashtag || filters.date || searchQuery) && (
          <button
            onClick={() => {
              onFiltersChange({ date: '', category: 'all', hashtag: '', sort: 'newest' })
              onSearchChange('')
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--accent-red)',
              fontWeight: '500'
            }}
          >
            {t('clearAllFilters')}
          </button>
        )}
        </div>
      )}
      
      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesUpdate={(updatedCategories) => {
          setCategories(updatedCategories)
          if (onCategoryAdded) {
            onCategoryAdded()
          }
        }}
      />
    </>
  )
}