import { useState } from 'react'
import { Search, Filter } from 'lucide-react'

export default function ControlBar({ 
  searchQuery, 
  onSearchChange, 
  onToggleFilters,
  showFilters 
}) {
  return (
    <div className="main-container">
      <div style={{
        background: 'white',
        borderRadius: window.innerWidth <= 768 ? '12px' : '16px',
        border: '1px solid var(--border-light)',
        padding: window.innerWidth <= 768 ? '8px' : '12px',
        marginBottom: window.innerWidth <= 768 ? '12px' : '16px',
        display: 'flex',
        gap: window.innerWidth <= 768 ? '8px' : '12px',
        alignItems: 'center',
        boxShadow: window.innerWidth <= 768 ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none'
      }}>
        {/* Search Bar */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search 
            size={window.innerWidth <= 768 ? 14 : 16} 
            style={{
              position: 'absolute',
              left: window.innerWidth <= 768 ? '12px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută în descrieri, titluri sau hashtag-uri..."
            className="input-field"
            style={{
              paddingLeft: window.innerWidth <= 768 ? '36px' : '42px',
              borderRadius: window.innerWidth <= 768 ? '14px' : '18px',
              padding: window.innerWidth <= 768 ? '8px 12px 8px 36px' : '12px 16px 12px 42px',
              fontSize: window.innerWidth <= 768 ? '14px' : '16px'
            }}
          />
        </div>

        {/* Filters Button */}
        <button
          onClick={onToggleFilters}
          style={{
            padding: window.innerWidth <= 768 ? '8px 12px' : '12px 20px',
            borderRadius: window.innerWidth <= 768 ? '14px' : '18px',
            border: '1px solid var(--border-light)',
            background: showFilters ? 'var(--accent-blue)' : 'white',
            color: showFilters ? 'white' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: window.innerWidth <= 768 ? '6px' : '8px',
            fontSize: window.innerWidth <= 768 ? '13px' : '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseOver={(e) => {
            if (!showFilters) {
              e.target.style.background = 'var(--bg-gray)'
            }
          }}
          onMouseOut={(e) => {
            if (!showFilters) {
              e.target.style.background = 'white'
            }
          }}
        >
          <Filter size={window.innerWidth <= 768 ? 12 : 14} />
          Filtre
          <span style={{
            fontSize: '12px',
            transition: 'all 0.2s ease-in-out',
            transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </button>
      </div>
    </div>
  )
}