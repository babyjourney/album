import { useEffect, useState } from 'react'
import SideSheet from './SideSheet'
import { useLanguage } from '../../contexts/LanguageContext'
import { getCategories } from '../../lib/categoriesData'
import { categoryDisplayLabel } from '../../lib/defaultCategories'
import { authenticatedFetch } from '../../lib/pinAuth'

export default function FilterDrawer({
  isOpen, onClose,
  filters, onFiltersChange,
  searchQuery, onSearchChange,
}) {
  const { t } = useLanguage()
  const [categories, setCategories] = useState([])
  const [existingHashtags, setExistingHashtags] = useState([])

  useEffect(() => {
    if (!isOpen) return
    getCategories().then(setCategories).catch(() => setCategories([]))
    // (Item 2) existing family hashtags for search suggestions
    authenticatedFetch('/api/hashtags/list')
      .then((r) => r.json())
      .then((d) => setExistingHashtags(d?.success ? (d.hashtags || []) : []))
      .catch(() => setExistingHashtags([]))
  }, [isOpen])

  const hashtagSuggestions = existingHashtags
    .filter((h) => {
      const q = (filters?.hashtag || '').trim().toLowerCase().replace(/^#/, '')
      return !q || h.includes(q)
    })
    .slice(0, 12)

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
        <h2 className="text-section-title" style={{ fontSize: 22 }}>{t('filtersAndSearch')}</h2>
        <button onClick={onClose} className="btn-icon" aria-label={t('close')} style={{ width: 36, height: 36 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Search */}
        {onSearchChange && (
          <Section label={t('search')}>
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
                placeholder={t('searchPlaceholder')}
                className="input-glass"
                style={{ paddingLeft: 40, borderRadius: 18 }}
                autoComplete="off"
              />
            </div>
          </Section>
        )}

        {/* Category */}
        <Section label={t('categories')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => update({ category: 'all' })}
              className={`category-pill ${filters?.category === 'all' || !filters?.category ? 'category-pill--selected' : ''}`}
            >
              {t('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => update({ category: cat.value })}
                className={`category-pill ${filters?.category === cat.value ? 'category-pill--selected' : ''}`}
              >
                {cat.emoji ? `${cat.emoji} ` : ''}{categoryDisplayLabel(cat, t)}
              </button>
            ))}
          </div>
        </Section>

        {/* Hashtag */}
        <Section label={t('hashtag')}>
          <input
            type="text"
            value={filters?.hashtag || ''}
            onChange={(e) => update({ hashtag: e.target.value })}
            placeholder={t('hashtagPlaceholder')}
            className="input-glass"
          />
          {/* (Item 2) suggestions from previously-used hashtags */}
          {hashtagSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {hashtagSuggestions.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => update({ hashtag: h })}
                  className={`category-pill ${filters?.hashtag === h ? 'category-pill--selected' : ''}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  #{h}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Date — second-to-last, immediately above Sort.
            Picking a date no longer filters to a ±5-day window; it anchors the
            feed: the 3 posts before that day, everything posted on it, and the
            3 posts after — however far apart those actually are. */}
        <Section label={t('date')}>
          <input
            type="date"
            value={filters?.date || ''}
            onChange={(e) => update({ date: e.target.value })}
            className="input-glass"
          />
          {filters?.date ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 8, marginTop: 8,
            }}>
              <span className="text-subtle" style={{ fontSize: 11.5, lineHeight: 1.35 }}>
                {t('dateAnchorHint')}
              </span>
              <button
                type="button"
                onClick={() => update({ date: '' })}
                className="category-pill"
                style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}
              >
                {t('clear')}
              </button>
            </div>
          ) : null}
        </Section>

        {/* Sort */}
        <Section label={t('sorting')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { value: 'newest', label: t('newest') },
              { value: 'oldest', label: t('oldest') },
              // These MUST match the keys /api/photos/list switches on. They
              // used to be titleAZ/titleZA, which matched nothing, so both
              // pills silently fell through to "newest".
              { value: 'title_asc', label: t('titleAZ') },
              { value: 'title_desc', label: t('titleZA') },
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
          {t('clearAllFilters')}
        </button>
        <button onClick={onClose} className="btn-iris sheen" style={{ flex: 1 }}>
          {t('done')}
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
