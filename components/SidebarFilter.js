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
        setCategories(cats)
      } catch (error) {
        console.error('Error loading categories:', error)
        // Fallback to cached/default categories
        setCategories(getCategoriesSync())
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
                borderRadius: '20px',
                padding: '20px',
                width: '90%',
                maxWidth: '400px',
                maxHeight: '80vh',
                overflowY: 'auto',
                margin: '20px'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
{t('searchAndFilters')}
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div style={{ marginBottom: '12px' }}>
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
                    placeholder={t('searchInDescriptions')}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Filters */}
              <FilterIsland
                isVisible={true}
                filters={filters}
                onFiltersChange={onFiltersChange}
              />
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
        <Filter size={20} color={hasActiveFilters ? '#3b82f6' : 'var(--text-secondary)'} />
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
            marginBottom: '6px'
          }}>
            {t('data')}
          </div>
          <input
            type="month"
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
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#dc2626',
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
        }}
      />
    </>
  )
}