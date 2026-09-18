// SINGLE SOURCE OF TRUTH for the default category set (item 9).
//
// The old set (memories / milestones / everyday / special / family / play /
// learning) overlapped with what people were already expressing as hashtags, so
// it got replaced with six categories that don't compete with tags:
//
//   Milestones · Family · Health · Education · Adventures · Everyday Life
//
// This list used to be copy-pasted into ~10 files (both seeders, four API
// fallbacks, several hardcoded chip lists), which is exactly how they drifted
// out of sync. Everything imports from here now.
//
// Two of the new ids — `health` and `education` — deliberately match the
// categories the Journey tabs already query for, so tagged posts finally show
// up in the Health and Education views.
//
// Safe to import from both server and client: no DOM, no process.env.

export const DEFAULT_CATEGORIES = [
  { value: 'milestones', label: 'Milestones',    emoji: '🎯' },
  { value: 'family',     label: 'Family',        emoji: '👨‍👩‍👧‍👦' },
  { value: 'health',     label: 'Health',        emoji: '🏥' },
  { value: 'education',  label: 'Education',     emoji: '📚' },
  { value: 'adventures', label: 'Adventures',    emoji: '🌍' },
  { value: 'everyday',   label: 'Everyday Life', emoji: '☀️' },
]

// What a new post is categorised as before the user picks anything.
export const DEFAULT_CATEGORY_VALUE = 'milestones'

// Categories that cannot be deleted — every post needs somewhere to live.
export const ESSENTIAL_CATEGORIES = ['milestones', 'family']

// value -> label, for rendering the badge on a card.
export const CATEGORY_LABELS = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.value, c.label])
)

// Retired id -> its replacement. sql/sergiu_batch2.sql rewrites photos.category
// in the database; this mirrors the same mapping in JS so a client holding a
// stale cached category (or an un-migrated deployment) still renders sensibly
// instead of showing a blank chip.
export const LEGACY_CATEGORY_REMAP = {
  memories: 'everyday',
  special: 'milestones',
  play: 'adventures',
  learning: 'education',
}

export const normalizeCategory = (value) =>
  (value && LEGACY_CATEGORY_REMAP[value]) || value

// Label for any category value, old or new. Falls back to a capitalized id so a
// user's own custom category still renders.
export const categoryLabel = (value) => {
  if (!value) return ''
  const normalized = normalizeCategory(value)
  return CATEGORY_LABELS[normalized] || (normalized[0].toUpperCase() + normalized.slice(1))
}

// (Sergiu 18.09) Default category id -> its key in contexts/translations/
// categories.js. Only the six defaults have translations.
const CATEGORY_I18N_KEYS = {
  milestones: 'categoryMilestones',
  family: 'categoryFamily',
  health: 'categoryHealth',
  education: 'categoryEducation',
  adventures: 'categoryAdventures',
  everyday: 'categoryEveryday',
}

// The label to SHOW for a category, in the site language. Takes either a
// category object ({ value, label, … }) or a bare value string, plus the t()
// from useLanguage(). Rules:
//   • a default category renders its translated name — UNLESS the family has
//     renamed it (stored label differs from the canonical English one), in
//     which case their own wording wins in every language;
//   • a custom category renders its stored label untouched;
//   • a bare legacy/unknown value falls back through categoryLabel().
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
