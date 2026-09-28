import dashboard from './dashboard'
import journey from './journey'
import auth from './auth'
import media from './media'
import errors from './errors'
import categories from './categories'

const MODULES = [dashboard, journey, auth, media, errors, categories]
const LANGS = ['ro', 'ru', 'en']

const merged = LANGS.reduce((acc, lang) => {
  acc[lang] = Object.assign({}, ...MODULES.map((m) => m[lang] || {}))
  return acc
}, {})

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
