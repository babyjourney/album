import { useLanguage } from '../contexts/LanguageContext'

const LANGS = [
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
]

export default function LanguagePicker({ style }) {
  const { language, changeLanguage } = useLanguage()
  return (
    <div style={{ display: 'inline-flex', gap: 4, ...style }}>
      {LANGS.map((l) => {
        const active = language === l.code
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => changeLanguage(l.code)}
            aria-label={l.label}
            aria-pressed={active}
            title={l.label}
            className={active ? 'category-pill category-pill--selected' : 'category-pill'}
            style={{ padding: '5px 9px', fontSize: 13, lineHeight: 1 }}
          >
            <span style={{ fontSize: 16 }}>{l.flag}</span>
          </button>
        )
      })}
    </div>
  )
}
