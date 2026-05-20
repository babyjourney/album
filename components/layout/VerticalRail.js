import { useState, useEffect } from 'react'

// Left-edge floating glass rail. On desktop only.
// Holds: search expand and filter chip. (Child switching moved to the top dock.)
export default function VerticalRail({
  onSearch,
  onFilters,
  searchQuery = '',
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState(searchQuery)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setSearchVal(searchQuery) }, [searchQuery])

  if (isMobile) return null

  return (
    <div style={{
      position: 'fixed',
      left: 'max(20px, env(safe-area-inset-left))',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 60,
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
    }}>
      {/* The rail itself */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '14px 10px',
        background: 'var(--glass-3)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid var(--glass-hairline-strong)',
        borderRadius: 36,
        boxShadow:
          '0 18px 50px -16px rgba(15,15,30,0.30),' +
          ' inset 0 1px 0 0 var(--glass-hairline-strong)',
      }}>
        {/* Search trigger */}
        {onSearch && (
          <RailButton
            active={searchOpen || !!searchQuery}
            onClick={() => setSearchOpen(s => !s)}
            tooltip="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </RailButton>
        )}

        {/* Filter chip trigger */}
        {onFilters && (
          <RailButton onClick={onFilters} tooltip="Filters">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4"  y1="6"  x2="20" y2="6"/>
              <line x1="7"  y1="12" x2="17" y2="12"/>
              <line x1="10" y1="18" x2="14" y2="18"/>
            </svg>
          </RailButton>
        )}
      </div>

      {/* Search slide-out */}
      {searchOpen && onSearch && (
        <div style={{
          background: 'var(--glass-3)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--glass-hairline-strong)',
          borderRadius: 24,
          padding: '12px 14px',
          boxShadow: '0 18px 50px -16px rgba(15,15,30,0.30), inset 0 1px 0 0 var(--glass-hairline-strong)',
          minWidth: 280,
          animation: 'rail-slide 320ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <input
            autoFocus
            type="text"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); onSearch(e.target.value) }}
            placeholder="Caută în amintiri..."
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 15,
              color: 'var(--ink-1)',
              fontFamily: 'inherit',
            }}
          />
          <style jsx>{`
            @keyframes rail-slide {
              from { opacity: 0; transform: translateX(-14px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

function RailButton({ children, onClick, tooltip, active }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      style={{
        position: 'relative',
        width: 44, height: 44,
        borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'linear-gradient(135deg, #a78bfa, #6d28d9)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.20)' : '1px solid transparent',
        color: active ? '#fff' : 'var(--ink-1)',
        cursor: 'pointer',
        transition: 'transform 240ms cubic-bezier(0.34,1.56,0.64,1), background 240ms',
        boxShadow: active
          ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 8px 18px -6px rgba(124,58,237,0.45)'
          : 'none',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--glass-2)'
        e.currentTarget.style.transform = 'scale(1.06)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {children}
    </button>
  )
}
