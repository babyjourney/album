import categoryTranslations from '../contexts/translations/categories'

export const DEFAULT_CATEGORIES = [
  { value: 'milestones', label: 'Milestones',    emoji: '🎯' },
  { value: 'family',     label: 'Family',        emoji: '👨‍👩‍👧‍👦' },
  { value: 'health',     label: 'Health',        emoji: '🏥' },
  { value: 'education',  label: 'Education',     emoji: '📚' },
  { value: 'adventures', label: 'Adventures',    emoji: '🌍' },
  { value: 'everyday',   label: 'Everyday Life', emoji: '☀️' },
]

export const DEFAULT_CATEGORY_VALUE = 'milestones'

export const ESSENTIAL_CATEGORIES = ['milestones', 'family']

export const CATEGORY_LABELS = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.value, c.label])
)

export const LEGACY_CATEGORY_REMAP = {
  memories: 'everyday',
  special: 'milestones',
  play: 'adventures',
  learning: 'education',
}

const CATEGORY_I18N_KEYS = {
  milestones: 'categoryMilestones',
  family: 'categoryFamily',
  health: 'categoryHealth',
  education: 'categoryEducation',
  adventures: 'categoryAdventures',
  everyday: 'categoryEveryday',
}

const LEGACY_SEEDED_LABELS = {
  milestones: ['Etape importante', 'Etape', '🎯 Etape importante'],
  family: ['Familie', '👨‍👩‍👧‍👦 Familie'],
  everyday: ['Zilnic', 'Everyday', '☀️ Zilnic'],
  memories: ['Amintiri', 'Memories', '💭 Amintiri'],
  special: ['Special', '✨ Special'],
  play: ['Joacă', '🎮 Joacă'],
  learning: ['Învățare', '📚 Învățare'],
}

const hasOwn = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key)

const foldLabel = (label) => {
  const base = String(label || '').normalize('NFD').toLowerCase()
  const kept = Array.from(base)
    .filter((ch) => (ch >= '0' && ch <= '9') || ch.toUpperCase() !== ch)
    .join('')
  return kept || base.trim()
}

const KNOWN_CATEGORY_LABELS = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => {
    const i18nKey = CATEGORY_I18N_KEYS[c.value]
    const legacyValues = Object.keys(LEGACY_CATEGORY_REMAP).filter((old) => LEGACY_CATEGORY_REMAP[old] === c.value)
    const labels = [
      c.label,
      ...Object.values(categoryTranslations).map((lang) => lang && lang[i18nKey]),
      ...(LEGACY_SEEDED_LABELS[c.value] || []),
      ...legacyValues.flatMap((old) => LEGACY_SEEDED_LABELS[old] || []),
    ]
    return [c.value, new Set(labels.filter(Boolean).map(foldLabel))]
  })
)

export const normalizeCategory = (value) =>
  (hasOwn(LEGACY_CATEGORY_REMAP, value) ? LEGACY_CATEGORY_REMAP[value] : value)

export const defaultCategoryLabel = (value) => {
  const normalized = normalizeCategory(value)
  return hasOwn(CATEGORY_LABELS, normalized) ? CATEGORY_LABELS[normalized] : null
}

export const isKnownCategoryLabel = (value, label) => {
  const normalized = normalizeCategory(value)
  return hasOwn(KNOWN_CATEGORY_LABELS, normalized) && typeof label === 'string' &&
    KNOWN_CATEGORY_LABELS[normalized].has(foldLabel(label))
}

export const canonicalCategoryLabel = (value, label) => {
  const trimmed = typeof label === 'string' ? label.trim() : ''
  const canonical = defaultCategoryLabel(value)
  if (canonical && (!trimmed || isKnownCategoryLabel(value, trimmed))) return canonical
  return trimmed
}

export const categoryLabel = (value) => {
  if (!value) return ''
  const normalized = String(normalizeCategory(value))
  return defaultCategoryLabel(normalized) || (normalized[0].toUpperCase() + normalized.slice(1))
}

export const findCategory = (categories, value) => {
  if (!value || !Array.isArray(categories)) return null
  const normalized = normalizeCategory(value)
  return categories.find((c) => c && c.value === value) ||
    categories.find((c) => c && normalizeCategory(c.value) === normalized) ||
    null
}

export function categoryDisplayLabel(catOrValue, t) {
  const isObj = !!catOrValue && typeof catOrValue === 'object'
  const value = normalizeCategory(isObj ? catOrValue.value : catOrValue)
  const i18nKey = hasOwn(CATEGORY_I18N_KEYS, value) ? CATEGORY_I18N_KEYS[value] : null
  const stored = isObj && typeof catOrValue.label === 'string' ? catOrValue.label.trim() : ''
  const renamed = !!stored && !isKnownCategoryLabel(value, stored)
  if (i18nKey && !renamed) return typeof t === 'function' ? t(i18nKey) : CATEGORY_LABELS[value]
  if (stored) return stored
  return categoryLabel(value)
}
