import { useState, useEffect } from 'react'
import { Search, Filter, X, Hash, Settings, Plus } from 'lucide-react'
import FilterIsland from './FilterIsland'
import { useLanguage } from '../contexts/LanguageContext'
import { getCategories } from '../lib/categoriesData'
import CategoryManager from './CategoryManager'

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
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState([])
  const { t } = useLanguage()

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
    setCategories(getCategories())
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
            background: hasActiveFilters ? 'var(--accent-blue)' : 'white',
            color: hasActiveFilters ? 'white' : 'var(--text-primary)',
            border: hasActiveFilters ? 'none' : '1px solid var(--border-light)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
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
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              backdropFilter: 'blur(4px)'
            }}>
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
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
                  margin: 0
                }}>
                  Căutare și Filtre
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
                    placeholder="Caută în descrieri, titluri sau hashtag-uri..."
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none'
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

  // Desktop version - permanent sidebar
  return (
    <>
      <div 
        style={{
          position: 'fixed',
          left: '10px',
          top: '80px',
          width: '240px',
          height: 'calc(100vh - 120px)',
          background: 'white',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '12px',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
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
            Filtre și Căutare
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
            Căutare
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
              placeholder="Caută în postări..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
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
              Categorii
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
              Gestionează
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              { value: 'all', label: 'Toate' },
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
                  background: (filters.category || 'all') === cat.value ? 'var(--accent-blue)' : 'white',
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
            Data
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
              background: 'white'
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
            Hashtag
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
              placeholder="hashtag"
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '11px',
                outline: 'none',
                boxSizing: 'border-box'
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
            Sortare
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
              background: 'white'
            }}
          >
            <option value="newest">Cel mai nou</option>
            <option value="oldest">Cel mai vechi</option>
            <option value="title_asc">Titlu A-Z</option>
            <option value="title_desc">Titlu Z-A</option>
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
            Șterge toate filtrele
          </button>
        )}
      </div>
      
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