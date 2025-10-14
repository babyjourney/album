import { useState, useEffect } from 'react'
import { Calendar, Hash, ArrowUpDown, Settings } from 'lucide-react'
import { getCategories } from '../lib/categoriesData'
import CategoryManager from './CategoryManager'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Cel mai nou' },
  { value: 'oldest', label: 'Cel mai vechi' },
  { value: 'title_asc', label: 'Titlu A-Z' },
  { value: 'title_desc', label: 'Titlu Z-A' }
]

export default function FilterIsland({ 
  isVisible,
  filters,
  onFiltersChange
}) {
  const [localHashtag, setLocalHashtag] = useState(filters.hashtag || '')
  const [categories, setCategories] = useState([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  // Load categories on mount
  useEffect(() => {
    const loadedCategories = getCategories()
    setCategories([{ value: 'all', label: 'Toate' }, ...loadedCategories])
  }, [])

  // Debounced live hashtag filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      const hashtag = localHashtag.trim().replace('#', '')
      if (hashtag !== filters.hashtag) {
        onFiltersChange({
          ...filters,
          hashtag: hashtag
        })
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [localHashtag, filters, onFiltersChange])

  // Update local hashtag when filters change externally
  useEffect(() => {
    setLocalHashtag(filters.hashtag || '')
  }, [filters.hashtag])

  const handleDateChange = (e) => {
    onFiltersChange({
      ...filters,
      date: e.target.value
    })
  }

  const handleCategoryChange = (category) => {
    onFiltersChange({
      ...filters,
      category: category
    })
  }

  const handleSortChange = (e) => {
    onFiltersChange({
      ...filters,
      sort: e.target.value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      date: '',
      category: 'all',
      hashtag: '',
      sort: 'newest'
    })
    setLocalHashtag('')
  }

  if (!isVisible) return null

  return (
    <div 
      className="main-container"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '24px'
      }}
    >
      <div className="card" style={{ 
        padding: '32px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
          {/* Date Filter */}
          <div>
            <label className="text-subtle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Calendar size={14} />
              Filtru după dată
            </label>
            <input
              type="date"
              value={filters.date || ''}
              onChange={handleDateChange}
              className="input-field"
            />
            <p className="text-subtle" style={{ fontSize: '11px', marginTop: '4px' }}>
              Arată postări din 5 zile înainte și după data selectată
            </p>
          </div>

          {/* Hashtag Filter */}
          <div>
            <label className="text-subtle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Hash size={14} />
              Filtru hashtag (live)
            </label>
            <input
              type="text"
              value={localHashtag}
              onChange={(e) => setLocalHashtag(e.target.value)}
              placeholder="#familie, #vacanță, etc."
              className="input-field"
            />
            {filters.hashtag && (
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  borderRadius: '18px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  #{filters.hashtag}
                  <button
                    onClick={() => {
                      onFiltersChange({...filters, hashtag: ''})
                      setLocalHashtag('')
                    }}
                    style={{
                      marginLeft: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Sorting */}
          <div>
            <label className="text-subtle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ArrowUpDown size={14} />
              Sortare
            </label>
            <select
              value={filters.sort || 'newest'}
              onChange={handleSortChange}
              className="input-field"
              style={{
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                backgroundPosition: 'right 0.75rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px', 
          borderTop: '1px solid #F3F4F6',
          gridColumn: '1 / -1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label className="text-subtle" style={{ fontWeight: '500' }}>
              Filtrare după categorie
            </label>
            <button
              onClick={() => setShowCategoryManager(true)}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-gray)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryChange(cat.value)}
                className={`category-pill ${(filters.category || 'all') === cat.value ? 'category-pill--selected' : 'category-pill--unselected'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters Button */}
        <div style={{ 
          marginTop: '24px', 
          display: 'flex', 
          justifyContent: 'flex-end',
          gridColumn: '1 / -1'
        }}>
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: 'transparent',
              border: '1px solid #E5E7EB',
              borderRadius: '18px',
              color: '#6B7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#FEF2F2'
              e.target.style.borderColor = '#FCA5A5'
              e.target.style.color = '#DC2626'
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.borderColor = '#E5E7EB'
              e.target.style.color = '#6B7280'
              e.target.style.transform = 'scale(1)'
            }}
          >
            Curăță toate filtrele
          </button>
        </div>
      </div>
      
      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesUpdate={(updatedCategories) => {
          setCategories([{ value: 'all', label: 'Toate' }, ...updatedCategories])
        }}
      />
    </div>
  )
}