import { useState, useEffect, useRef } from 'react'
import { Search, Filter, X, Hash, Settings, Plus } from 'lucide-react'
import FilterIsland from './FilterIsland'
import { useLanguage } from '../contexts/LanguageContext'
import { getCategories, getCategoriesSync } from '../lib/categoriesData'
import CategoryManager from './CategoryManager'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { useTier } from '../hooks/useTier'

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

if (typeof document !== 'undefined' && !document.getElementById('sidebar-animations')) {
  const style = document.createElement('style')
  style.id = 'sidebar-animations'
  style.textContent = animations
  document.head.appendChild(style)
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const TRANSITION = `all 220ms ${EASE}`

const sectionStyle = {
  padding: '14px 0',
  borderBottom: '1px solid var(--glass-hairline)'
}

const labelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  marginBottom: '10px',
  display: 'block'
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
  const { has: hasFeature, requiredTierLabel } = useTier()
  const canCustomize = hasFeature('customCategories')
  const sidebarRef = useRef(null)

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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories()
        setCategories([{ value: 'all', label: 'Toate', emoji: '📱' }, ...cats])
      } catch (error) {
        console.error('Error loading categories:', error)
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

  const sortOptions = [
    { value: 'newest', label: t('newest') },
    { value: 'oldest', label: t('oldest') },
    { value: 'title_asc', label: t('titleAZ') },
    { value: 'title_desc', label: t('titleZA') }
  ]

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setShowMobileFilters(true)}
          className="floating-button"
          style={{
            position: 'fixed',
            bottom: '140px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            color: hasActiveFilters ? 'var(--accent-iris)' : 'var(--ink-1)'
          }}
        >
          <Filter size={22} />
          {hasActiveFilters && (
            <span style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-iris)',
              boxShadow: '0 0 0 2px var(--canvas)'
            }} />
          )}
        </button>

        {showMobileFilters && (
          <div
            className="modal-scrim"
            onClick={() => setShowMobileFilters(false)}
            style={{ alignItems: 'flex-end', padding: 0, zIndex: 1001 }}
          >
            <div
              className="modal-glass"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '100%',
                borderRadius: '28px 28px 0 0',
                maxHeight: '85vh',
                padding: '20px',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: 'var(--glass-hairline-strong)',
                margin: '0 auto 16px'
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}>
                <h3 className="text-section-title" style={{ margin: 0 }}>
                  {t('filtersAndSearch')}
                </h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowMobileFilters(false)}
                  style={{ width: 40, height: 40 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-3)',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />
                <input
                  type="text"
                  className="input-glass"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('searchPlaceholder') || 'Caută în descrieri...'}
                  style={{ paddingLeft: '40px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('categories') || 'Categorie'}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {categories.map((cat) => {
                      const selected = (filters.category || 'all') === cat.value
                      return (
                        <button
                          key={cat.value}
                          onClick={() => onFiltersChange({ ...filters, category: cat.value })}
                          className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                        >
                          {cat.emoji && <span>{cat.emoji}</span>}{cat.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('data') || 'Dată'}</label>
                  <input
                    type="date"
                    className="input-glass"
                    value={filters.date || ''}
                    onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
                  />
                </div>

                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('hashtag') || 'Hashtag'}</label>
                  <div style={{ position: 'relative' }}>
                    <Hash
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--ink-3)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                    <input
                      type="text"
                      className="input-glass"
                      value={filters.hashtag || ''}
                      onChange={(e) => onFiltersChange({ ...filters, hashtag: e.target.value.replace('#', '') })}
                      placeholder={t('hashtagPlaceholder') || '#familie, #vacanță...'}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>

                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('sorting') || 'Sortare'}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {sortOptions.map((opt) => {
                      const selected = (filters.sort || 'newest') === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => onFiltersChange({ ...filters, sort: opt.value })}
                          className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => onFiltersChange({ date: '', category: 'all', hashtag: '', sort: 'newest' })}
                    className="btn-ghost"
                    style={{
                      width: '100%',
                      color: hasActiveFilters ? 'var(--accent-red)' : 'var(--ink-2)'
                    }}
                  >
                    {t('clearAllFilters') || 'Șterge toate filtrele'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowDesktopSidebar(!showDesktopSidebar)}
        className="btn-icon"
        style={{
          position: 'fixed',
          left: showDesktopSidebar ? '316px' : '20px',
          top: '80px',
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          zIndex: 200,
          transition: `left 280ms ${EASE}, transform 200ms ${EASE}, background 180ms ${EASE}`,
          color: hasActiveFilters ? 'var(--accent-iris)' : 'var(--ink-1)'
        }}
      >
        <Filter size={20} />
        {hasActiveFilters && (
          <span style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent-iris)',
            boxShadow: '0 0 0 2px var(--canvas)'
          }} />
        )}
      </button>

      {showDesktopSidebar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-scrim)',
            backdropFilter: 'blur(8px) saturate(140%)',
            WebkitBackdropFilter: 'blur(8px) saturate(140%)',
            zIndex: 140,
            opacity: 1,
            transition: `opacity 280ms ${EASE}`
          }}
        />
      )}

      {showDesktopSidebar && (
        <div
          ref={sidebarRef}
          className="glass-strong"
          style={{
            position: 'fixed',
            left: '16px',
            top: '80px',
            width: '300px',
            height: 'calc(100vh - 100px)',
            borderRadius: '24px',
            padding: '18px 18px 22px',
            zIndex: 150,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: `slideInLeft 320ms ${EASE}`
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--glass-hairline)'
          }}>
            <h3 className="text-section-title" style={{ margin: 0 }}>
              {t('filtersAndSearch')}
            </h3>
            <Filter size={18} color="var(--accent-iris)" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>{t('search')}</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-3)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                type="text"
                className="input-glass"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('searchPlaceholder')}
                style={{ paddingLeft: '40px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                {t('categories')}
              </label>
              <button
                onClick={() => {
                  if (!canCustomize) return
                  setShowCategoryManager(true)
                }}
                disabled={!canCustomize}
                title={canCustomize ? undefined : `Disponibil în planul ${requiredTierLabel('customCategories')}`}
                className="btn-glass"
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  borderRadius: '10px',
                  gap: '6px',
                  opacity: canCustomize ? 1 : 0.55,
                  cursor: canCustomize ? 'pointer' : 'not-allowed',
                }}
              >
                <Settings size={12} />
                {t('manage')}
                {!canCustomize && <span style={{ marginLeft: 2 }}>🔒</span>}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { value: 'all', label: t('all') },
                ...categories
              ].map((cat) => {
                const selected = (filters.category || 'all') === cat.value
                return (
                  <button
                    key={cat.value}
                    onClick={() => onFiltersChange({ ...filters, category: cat.value })}
                    className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                    style={{ padding: '5px 11px', fontSize: '12px' }}
                  >
                    {cat.emoji && <span>{cat.emoji}</span>}{cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                {t('data')}
              </label>
              {filters.date && (
                <button
                  onClick={() => onFiltersChange({ ...filters, date: '' })}
                  className="btn-ghost"
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <input
              type="date"
              className="input-glass"
              value={filters.date}
              onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
              style={{ padding: '10px 14px', fontSize: '13px' }}
            />
            {filters.date && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: 'var(--glass-1)',
                borderRadius: '12px',
                border: '1px solid var(--glass-hairline)'
              }}>
                <div className="text-tertiary" style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  📅 Days around {new Date(filters.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '4px'
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
                            padding: '6px 2px',
                            border: '1px solid var(--glass-hairline)',
                            borderRadius: '8px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            background: isSelected
                              ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                              : 'var(--glass-2)',
                            color: isSelected ? '#fff' : 'var(--ink-1)',
                            textAlign: 'center',
                            transition: TRANSITION,
                            boxShadow: isSelected
                              ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 4px 14px -4px rgba(124,58,237,0.50)'
                              : 'inset 0 1px 0 0 var(--glass-hairline-strong)'
                          }}
                        >
                          <div style={{ fontSize: '9px', opacity: 0.75 }}>
                            {date.toLocaleDateString('en', { weekday: 'narrow' })}
                          </div>
                          <div style={{ fontWeight: isSelected ? 700 : 500 }}>
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

          <div style={sectionStyle}>
            <label style={labelStyle}>{t('hashtag')}</label>
            <div style={{ position: 'relative' }}>
              <Hash
                size={14}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-3)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                type="text"
                className="input-glass"
                value={filters.hashtag}
                onChange={(e) => onFiltersChange({ ...filters, hashtag: e.target.value.replace('#', '') })}
                placeholder={t('hashtagPlaceholder')}
                style={{ paddingLeft: '38px', padding: '10px 14px 10px 38px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>{t('sorting')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {sortOptions.map((opt) => {
                const selected = (filters.sort || 'newest') === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => onFiltersChange({ ...filters, sort: opt.value })}
                    className={`category-pill ${selected ? 'category-pill--selected' : ''}`}
                    style={{ padding: '5px 11px', fontSize: '11px' }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {(filters.category !== 'all' || filters.hashtag || filters.date || searchQuery) && (
            <button
              onClick={() => {
                onFiltersChange({ date: '', category: 'all', hashtag: '', sort: 'newest' })
                onSearchChange('')
              }}
              className="btn-ghost"
              style={{
                width: '100%',
                marginTop: '14px',
                color: 'var(--accent-red)',
                border: '1px solid var(--glass-hairline)',
                fontWeight: 600
              }}
            >
              {t('clearAllFilters')}
            </button>
          )}
        </div>
      )}

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
