// Modular translation dictionaries (item 13).
//
// Switching to English only translated the header, because ~400 user-facing
// strings across the app were hardcoded Romanian literals that never went
// through t(). Fixing that means adding a lot of keys, and one giant dictionary
// file is both unreviewable and a merge-conflict magnet — so the new keys live
// in per-area modules that are merged here.
//
// Each module exports { ro: {...}, ru: {...}, en: {...} } with the SAME key set.
// Keys must be unique across modules: a later module silently wins, which is
// exactly the bug that already exists inside the legacy dictionary (`skills`,
// `createPost`, `save`, `cancel` and `loading` are each declared twice there).

import dashboard from './dashboard'
import journey from './journey'
import auth from './auth'
import media from './media'
import errors from './errors'
import categories from './categories'

const MODULES = [dashboard, journey, auth, media, errors, categories]
const LANGS = ['ro', 'ru', 'en']

// Merge every module into one dict per language.
const merged = LANGS.reduce((acc, lang) => {
  acc[lang] = Object.assign({}, ...MODULES.map((m) => m[lang] || {}))
  return acc
}, {})

// Dev-only: shout about a key that two modules both define, since the collision
// would otherwise be silent and one area's copy would mysteriously change.
if (process.env.NODE_ENV !== 'production') {
  const seen = new Map()
  for (const mod of MODULES) {
    for (const key of Object.keys(mod.ro || {})) {
      if (seen.has(key)) {
        console.warn(`[i18n] duplicate key "${key}" defined in two translation modules`)
      }
      seen.set(key, true)
    }
  }
}

export default merged
