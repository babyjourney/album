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

  return (
    <div style={{ marginBottom: '20px' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--text-primary)'
        }}>
          {label}
        </label>
      )}
      
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        {/* Day Selector */}
        <div style={{ flex: '1' }}>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {t('day')}
          </label>
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="">-</option>
            {days.map(d => (
              <option key={d} value={String(d).padStart(2, '0')}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div style={{ flex: '1' }}>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {t('month')}
          </label>
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="">-</option>
            {months.map(m => (
              <option key={m} value={String(m).padStart(2, '0')}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div style={{ flex: '1' }}>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {t('year')}
          </label>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="">-</option>
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}