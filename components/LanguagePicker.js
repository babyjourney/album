import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'

const LANGS = [
  { code: 'ro', short: 'RO', label: 'Română' },
  { code: 'ru', short: 'RU', label: 'Русский' },
  { code: 'en', short: 'EN', label: 'English' },
]

export default function LanguagePicker({ style }) {
  const { language, changeLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])
  const menuId = useId()

  const currentIndex = Math.max(0, LANGS.findIndex((l) => l.code === language))
  const current = LANGS[currentIndex]

  const close = useCallback(() => setOpen(false), [])
  useOnClickOutside(rootRef, close)

  useEffect(() => {
    if (open) itemRefs.current[currentIndex]?.focus()
  }, [open, currentIndex])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const focusItem = (index) => {
    const count = LANGS.length
    itemRefs.current[(index + count) % count]?.focus()
  }

  const select = (code) => {
    changeLanguage(code)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const onMenuKeyDown = (event) => {
    const index = itemRefs.current.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItem(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItem(index < 0 ? LANGS.length - 1 : index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusItem(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusItem(LANGS.length - 1)
    } else if (event.key === 'Tab') {
      triggerRef.current?.focus()
      setOpen(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className="lang-picker"
      style={{ position: 'relative', display: 'inline-block', zIndex: 30, ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="lang-picker__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('languagePickerAria', { language: current.label })}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 12px 0 11px',
          borderRadius: 999,
          border: '1px solid var(--glass-hairline-strong)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          boxShadow: 'inset 0 1px 0 0 var(--glass-hairline-strong), 0 6px 18px -8px rgba(var(--shadow-rim-rgb), 0.35)',
          color: 'var(--ink-1)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19" />
          <path d="M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z" />
        </svg>
        <span className="lang-picker__name" lang={current.code}>{current.label}</span>
        <span className="lang-picker__code" aria-hidden="true">{current.short}</span>
        <svg className="lang-picker__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('languagePickerMenuAria')}
          className="lang-picker__menu"
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 200,
            padding: 6,
            borderRadius: 18,
            background: 'linear-gradient(var(--glass-3), var(--glass-3)), var(--canvas)',
            border: '1px solid var(--glass-hairline-strong)',
            boxShadow: '0 24px 60px -16px rgba(var(--shadow-rim-rgb), 0.38), 0 2px 10px -2px rgba(var(--shadow-rim-rgb), 0.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {LANGS.map((l, index) => {
            const active = l.code === language
            return (
              <button
                key={l.code}
                ref={(el) => { itemRefs.current[index] = el }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                tabIndex={-1}
                className="lang-picker__item"
                onClick={() => select(l.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  minHeight: 44,
                  padding: '0 12px 0 8px',
                  borderRadius: 12,
                  border: 'none',
                  color: 'var(--ink-1)',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 32,
                    height: 24,
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: active ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(124, 58, 237, 0.12)',
                    color: active ? '#fff' : 'var(--ink-2)',
                    flexShrink: 0,
                  }}
                >
                  {l.short}
                </span>
                <span lang={l.code} style={{ flex: 1 }}>{l.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-iris)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, visibility: active ? 'visible' : 'hidden' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .lang-picker__trigger {
          background: var(--glass-2);
          transition: background 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lang-picker__trigger:hover,
        .lang-picker__trigger[aria-expanded='true'] {
          background: var(--glass-3);
        }
        .lang-picker__trigger:active {
          transform: scale(0.97);
        }
        .lang-picker__trigger:focus-visible {
          outline: 2px solid var(--accent-iris);
          outline-offset: 2px;
        }
        .lang-picker__code {
          display: none;
        }
        .lang-picker__chevron {
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lang-picker__menu {
          transform-origin: top right;
          animation: lang-picker-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lang-picker__item {
          background: transparent;
          transition: background 140ms ease;
        }
        .lang-picker__item:hover {
          background: rgba(124, 58, 237, 0.08);
        }
        .lang-picker__item[aria-checked='true'] {
          background: rgba(124, 58, 237, 0.14);
        }
        .lang-picker__item[aria-checked='true']:hover {
          background: rgba(124, 58, 237, 0.18);
        }
        .lang-picker__item:focus-visible {
          outline: 2px solid var(--accent-iris);
          outline-offset: -2px;
        }
        @keyframes lang-picker-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 420px) {
          .lang-picker__name { display: none; }
          .lang-picker__code { display: inline; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lang-picker__trigger,
          .lang-picker__chevron,
          .lang-picker__item { transition: none; }
          .lang-picker__menu { animation: none; }
        }
      `}</style>
    </div>
  )
}
