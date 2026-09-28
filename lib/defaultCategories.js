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

export const normalizeCategory = (value) =>
  (value && LEGACY_CATEGORY_REMAP[value]) || value

export const categoryLabel = (value) => {
  if (!value) return ''
  const normalized = normalizeCategory(value)
  return CATEGORY_LABELS[normalized] || (normalized[0].toUpperCase() + normalized.slice(1))
}

const CATEGORY_I18N_KEYS = {
  milestones: 'categoryMilestones',
  family: 'categoryFamily',
  health: 'categoryHealth',
  education: 'categoryEducation',
  adventures: 'categoryAdventures',
  everyday: 'categoryEveryday',
}

export function categoryDisplayLabel(catOrValue, t) {
  const isObj = !!catOrValue && typeof catOrValue === 'object'
  const value = normalizeCategory(isObj ? catOrValue.value : catOrValue)
  const i18nKey = value && CATEGORY_I18N_KEYS[value]
  const renamed = isObj && catOrValue.label && CATEGORY_LABELS[value] &&
    catOrValue.label !== CATEGORY_LABELS[value]
  if (i18nKey && typeof t === 'function' && !renamed) return t(i18nKey)
  if (isObj && catOrValue.label) return catOrValue.label
  return categoryLabel(value)
}
