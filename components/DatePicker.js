import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function DatePicker({ value, onChange, label }) {
  const { t } = useLanguage()
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setDay(String(date.getDate()).padStart(2, '0'))
      setMonth(String(date.getMonth() + 1).padStart(2, '0'))
      setYear(String(date.getFullYear()))
    } else {
      // Set to current date by default
      const now = new Date()
      setDay(String(now.getDate()).padStart(2, '0'))
      setMonth(String(now.getMonth() + 1).padStart(2, '0'))
      setYear(String(now.getFullYear()))
      // Trigger onChange with current date
      onChange(now.toISOString())
    }
  }, [value])

  const handleDateChange = (newDay, newMonth, newYear) => {
    if (newDay && newMonth && newYear) {
      const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, parseInt(newDay))
      onChange(date.toISOString())
    }
  }

  const handleDayChange = (newDay) => {
    setDay(newDay)
    handleDateChange(newDay, month, year)
  }

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth)
    handleDateChange(day, newMonth, year)
  }

  const handleYearChange = (newYear) => {
    setYear(newYear)
    handleDateChange(day, month, newYear)
  }

  // Generate options
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--glass-hairline)',
    borderRadius: '14px',
    fontSize: '14px',
    background: 'var(--glass-2)',
    backdropFilter: 'blur(12px) saturate(140%)',
    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
    color: 'var(--ink-1)',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)'
  }

  const optionStyle = { background: 'var(--canvas)', color: 'var(--ink-1)' }

  const subLabelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)'
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      {label && (
        <label
          className="text-eyebrow"
          style={{
            display: 'block',
            marginBottom: '10px',
            color: 'var(--ink-2)'
          }}
        >
          {label}
        </label>
      )}

      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Day Selector */}
        <div style={{ flex: 1 }}>
          <label style={subLabelStyle}>
            {t('day')}
          </label>
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={optionStyle}>-</option>
            {days.map(d => (
              <option key={d} value={String(d).padStart(2, '0')} style={optionStyle}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div style={{ flex: 1 }}>
          <label style={subLabelStyle}>
            {t('month')}
          </label>
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={optionStyle}>-</option>
            {months.map(m => (
              <option key={m} value={String(m).padStart(2, '0')} style={optionStyle}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div style={{ flex: 1 }}>
          <label style={subLabelStyle}>
            {t('year')}
          </label>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={optionStyle}>-</option>
            {years.map(y => (
              <option key={y} value={y} style={optionStyle}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
