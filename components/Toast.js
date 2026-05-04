import { useState, useEffect } from 'react'

const TOAST_TYPES = {
  success: {
    accent: 'var(--accent-mint)',
    tint: 'rgba(52, 211, 153, 0.10)',
    border: 'rgba(52, 211, 153, 0.30)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  },
  error: {
    accent: 'var(--accent-red)',
    tint: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.30)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  },
  info: {
    accent: 'var(--accent-aqua)',
    tint: 'rgba(56, 189, 248, 0.10)',
    border: 'rgba(56, 189, 248, 0.30)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16" />
        <circle cx="12" cy="8" r="0.8" fill="currentColor" />
      </svg>
    )
  },
  warning: {
    accent: 'var(--accent-amber)',
    tint: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.30)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" />
      </svg>
    )
  }
}

export default function Toast({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const timer1 = setTimeout(() => setIsVisible(true), 10)

    // Auto-remove after duration
    const timer2 = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onRemove(toast.id), 200)
    }, toast.duration || 5000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [toast.id, toast.duration, onRemove])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const toastType = TOAST_TYPES[toast.type] || TOAST_TYPES.info

  const active = isVisible && !isLeaving

  return (
    <div
      className="glass-strong"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px 12px 14px',
        borderRadius: '18px',
        background: `linear-gradient(180deg, ${toastType.tint}, var(--glass-2))`,
        border: `1px solid ${toastType.border}`,
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
        minWidth: '260px',
        maxWidth: '380px',
        transform: active ? 'translateX(0)' : 'translateX(110%)',
        opacity: active ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: toastType.accent,
          background: toastType.tint,
          border: `1px solid ${toastType.border}`
        }}
      >
        {toastType.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <h4
            style={{
              margin: 0,
              marginBottom: '2px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--ink-1)',
              letterSpacing: '-0.01em'
            }}
          >
            {toast.title}
          </h4>
        )}
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--ink-2)',
            lineHeight: 1.45
          }}
        >
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        aria-label="Close"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: 'var(--ink-3)',
          cursor: 'pointer',
          transition: 'color 200ms cubic-bezier(0.22, 1, 0.36, 1), background 200ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = 'var(--ink-1)'
          e.currentTarget.style.background = 'var(--glass-3)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = 'var(--ink-3)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
