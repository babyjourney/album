import { useEffect, useState } from 'react'
import SideSheet from './SideSheet'
import { useLanguage } from '../../contexts/LanguageContext'
import { getCategories } from '../../lib/categoriesData'

export default function FilterDrawer({
  isOpen, onClose,
  filters, onFiltersChange,
  searchQuery, onSearchChange,
}) {
  const { t } = useLanguage()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!isOpen) return
    getCategories().then(setCategories).catch(() => setCategories([]))
  }, [isOpen])

  const update = (patch) => onFiltersChange({ ...filters, ...patch })

  const reset = () => {
    onFiltersChange({ date: '', category: 'all', hashtag: '', sort: 'newest' })
    onSearchChange && onSearchChange('')
  }

  const hasActiveFilters =
    filters?.date || (filters?.category && filters.category !== 'all') ||
    filters?.hashtag || (searchQuery && searchQuery.trim())

  return (
    <SideSheet isOpen={isOpen} onClose={onClose} side="left" width={380}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid var(--glass-hairline)',
        flexShrink: 0,
      }}>
        <h2 className="text-section-title" style={{ fontSize: 22 }}>{t('filtersAndSearch') || 'Filters'}</h2>
        <button onClick={onClose} className="btn-icon" aria-label="Close" style={{ width: 36, height: 36 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Search */}
        {onSearchChange && (
          <Section label={t('search') || 'Search'}>
            <div style={{ position: 'relative' }}>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none', zIndex: 1 }}
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('searchPlaceholder') || 'Search...'}
                className="input-glass"
                style={{ paddingLeft: 40, borderRadius: 18 }}
                autoComplete="off"
              />
            </div>
          </Section>
        )}

        {/* Date */}
        <Section label={t('date') || 'Date'}>
          <input
            type="date"
            value={filters?.date || ''}
            onChange={(e) => update({ date: e.target.value })}
            className="input-glass"
          />
        </Section>

        {/* Category */}
        <Section label={t('categories') || 'Categories'}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => update({ category: 'all' })}
              className={`category-pill ${filters?.category === 'all' || !filters?.category ? 'category-pill--selected' : ''}`}
            >
              {t('all') || 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => update({ category: cat.value })}
                className={`category-pill ${filters?.category === cat.value ? 'category-pill--selected' : ''}`}
              >
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Hashtag */}
        <Section label={t('hashtag') || 'Hashtag'}>
          <input
            type="text"
            value={filters?.hashtag || ''}
            onChange={(e) => update({ hashtag: e.target.value })}
            placeholder={t('hashtagPlaceholder') || 'hashtag'}
            className="input-glass"
          />
        </Section>

        {/* Sort */}
        <Section label={t('sorting') || 'Sort'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { value: 'newest', label: t('newest') || 'Newest' },
              { value: 'oldest', label: t('oldest') || 'Oldest' },
              { value: 'titleAZ', label: t('titleAZ') || 'A-Z' },
              { value: 'titleZA', label: t('titleZA') || 'Z-A' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ sort: opt.value })}
                className={`category-pill ${filters?.sort === opt.value ? 'category-pill--selected' : ''}`}
                style={{ justifyContent: 'center' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div style={{
        padding: '16px 24px max(20px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--glass-hairline)',
        display: 'flex', gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={reset} className="btn-glass" style={{ flex: 1 }} disabled={!hasActiveFilters}>
          {t('clearAllFilters') || 'Clear'}
        </button>
        <button onClick={onClose} className="btn-iris sheen" style={{ flex: 1 }}>
          {t('done') || 'Done'}
        </button>
      </div>
    </SideSheet>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label className="text-eyebrow" style={{ display: 'block', marginBottom: 10 }}>{label}</label>
      {children}
    </div>
  )
}
