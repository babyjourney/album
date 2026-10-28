import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  COUNTRIES,
  PINNED_COUNT,
  DEFAULT_COUNTRY,
  dialOf,
  parsePhone,
  composePhone,
  countryOfE164,
  exampleNumberOf,
} from '../lib/phone'

const FOCUS_RING = {
  background: 'var(--glass-2)',
  borderColor: 'var(--accent-iris)',
  boxShadow: 'inset 0 1px 0 0 var(--glass-hairline-strong), 0 0 0 4px rgba(124, 58, 237, 0.18)',
}

const INTL_START = /^(\+|00)/
const SEPARATORS = /[\s\-().]/g

let lastCountry = null

const preferSameDial = (code, ...preferred) =>
  (code && preferred.find((p) => p && dialOf(p) === dialOf(code))) || code

export default function PhoneInput({ value, onChange, id, required, autoFocus, disabled, placeholder }) {
  const { t, locale } = useLanguage()
  const [country, setCountry] = useState(() => preferSameDial(parsePhone(value).country, lastCountry) || DEFAULT_COUNTRY)
  const [text, setText] = useState(() => parsePhone(value).national)
  const [selectFocused, setSelectFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const emitted = useRef(value || '')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => { lastCountry = country }, [country])

  useEffect(() => {
    const incoming = value || ''
    if (incoming === emitted.current) return
    emitted.current = incoming
    const parsed = parsePhone(incoming)
    if (parsed.country) setCountry((prev) => preferSameDial(parsed.country, prev))
    setText(parsed.national)
  }, [value])

  const emit = (full) => {
    emitted.current = full
    if (onChange) onChange(full)
  }

  const options = useMemo(() => {
    if (!mounted) return null
    let nameOf = (code) => code
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'region' })
      nameOf = (code) => dn.of(code) || code
    } catch {}
    const withNames = COUNTRIES.map((c) => ({ ...c, name: nameOf(c.code) }))
    return {
      pinned: withNames.slice(0, PINNED_COUNT),
      rest: withNames.slice(PINNED_COUNT).sort((a, b) => a.name.localeCompare(b.name, locale)),
    }
  }, [locale, mounted])

  const current = useMemo(
    () => (options
      ? options.pinned.find((c) => c.code === country) || options.rest.find((c) => c.code === country)
      : COUNTRIES.find((c) => c.code === country)),
    [options, country]
  )

  const handleCountry = (e) => {
    const code = e.target.value
    if (!code) return
    const keep = text.startsWith('+') ? '' : text
    setCountry(code)
    setText(keep)
    emit(composePhone(code, keep))
  }

  const handleNumber = (e) => {
    const raw = e.target.value
    const compact = raw.trim().replace(SEPARATORS, '')
    if (INTL_START.test(compact)) {
      const intl = '+' + compact.replace(INTL_START, '').replace(/\D/g, '').slice(0, 15)
      const match = countryOfE164(intl)
      if (match) {
        const target = preferSameDial(match.code, country)
        const national = intl.slice(match.dial.length)
        setCountry(target)
        setText(national)
        emit(composePhone(target, national))
        return
      }
      setText(intl)
      emit('')
      return
    }
    const digits = raw.replace(/\D/g, '').slice(0, 15)
    setText(digits)
    emit(composePhone(country, digits))
  }

  const renderOption = (c) => (
    <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>
  )

  return (
    <div style={{ display: 'flex', gap: 8, width: '100%', minWidth: 0 }}>
      <div
        className="input-glass"
        title={current?.name ? `${current.name} (${current.dial})` : undefined}
        style={{
          position: 'relative',
          width: 'auto',
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px 0 12px',
          opacity: disabled ? 0.55 : 1,
          ...(selectFocused ? FOCUS_RING : null),
        }}
      >
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{current?.flag}</span>
        <span aria-hidden className="nums" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>
          {dialOf(country)}
        </span>
        <svg aria-hidden width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <select
          id={id ? `${id}-country` : undefined}
          value={country}
          onChange={handleCountry}
          onFocus={() => setSelectFocused(true)}
          onBlur={() => setSelectFocused(false)}
          disabled={disabled}
          aria-label={t('signupCountryLabel')}
          className="input-glass"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            opacity: 0,
            fontSize: 16,
            cursor: disabled ? 'default' : 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {options ? (
            <>
              {options.pinned.map(renderOption)}
              <option disabled value="">──────────</option>
              {options.rest.map(renderOption)}
            </>
          ) : (
            <option value={country}>{current?.flag} {dialOf(country)}</option>
          )}
        </select>
      </div>
      <input
        id={id}
        name={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={text}
        onChange={handleNumber}
        placeholder={placeholder ?? exampleNumberOf(country)}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className="input-glass nums"
        style={{ flex: 1, minWidth: 0 }}
      />
    </div>
  )
}
