import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useLanguage } from '../../contexts/LanguageContext'

// Top-center floating dock — the only chrome on every page.
// Contains: home, skills/album toggle, search, settings, sign-out.
// Title pill in the middle (hidden on mobile and when scrolled).
export default function FloatingDock({ albumTitle, onSearch, onSettings, onSignOut }) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const isSkillsPage = router.pathname === '/skills'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    const onResize = () => setIsMobile(window.innerWidth < 640)
    onScroll(); onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const showTitle = albumTitle && !isMobile && !scrolled

  return (
    <div style={{
      position: 'fixed',
      top: 'max(12px, env(safe-area-inset-top))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 80,
      pointerEvents: 'none',
      maxWidth: 'calc(100vw - 24px)',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 6,
        background: 'var(--glass-3)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid var(--glass-hairline-strong)',
        borderRadius: 999,
        boxShadow:
          '0 18px 50px -16px rgba(15,15,30,0.30),' +
          ' inset 0 1px 0 0 var(--glass-hairline-strong),' +
          ' inset 0 -1px 0 0 rgba(0,0,0,0.04)',
      }}>
        <DockIconButton
          onClick={() => router.push('/dashboard')}
          title={t('home') || 'Home'}
          tone="iris"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12 12 3l9 9"/>
            <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>
          </svg>
        </DockIconButton>

        <DockIconButton
          onClick={() => router.push(isSkillsPage ? '/dashboard' : '/skills')}
          title={isSkillsPage ? (t('album') || 'Album') : (t('skills') || 'Skills')}
        >
          {isSkillsPage ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2.5"/>
              <circle cx="9" cy="9" r="1.6"/>
              <path d="m21 15-5-5-7 7"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          )}
        </DockIconButton>

        {/* Title pill — desktop only, hides on scroll */}
        {showTitle && (
          <div style={{
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.005em',
            maxWidth: 240,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            flex: '0 1 auto',
          }}>
            {albumTitle}
          </div>
        )}

        {onSearch && (
          <DockIconButton onClick={onSearch} title={t('search') || 'Search'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </DockIconButton>
        )}

        <DockIconButton onClick={onSettings} title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </DockIconButton>

        <DockIconButton onClick={onSignOut} title={t('signOut') || 'Sign out'} tone="danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </DockIconButton>
      </div>
    </div>
  )
}

function DockIconButton({ children, onClick, title, tone = 'neutral' }) {
  const tones = {
    neutral: { color: 'var(--ink-1)', hoverBg: 'var(--glass-1)' },
    iris:    { color: '#fff', bg: 'linear-gradient(135deg, #a78bfa, #7c3aed)', hoverBg: null },
    danger:  { color: 'var(--ink-1)', hoverBg: 'rgba(239,68,68,0.12)', hoverColor: '#dc2626' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 38, height: 38,
        minWidth: 38, minHeight: 38,
        maxWidth: 38, maxHeight: 38,
        aspectRatio: '1 / 1',
        flex: '0 0 38px',
        borderRadius: '50%',
        padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: t.bg || 'transparent',
        border: tone === 'iris' ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
        color: t.color,
        cursor: 'pointer',
        transition: 'background 200ms cubic-bezier(0.22,1,0.36,1), color 200ms, transform 200ms',
        boxShadow: tone === 'iris'
          ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 16px -6px rgba(124,58,237,0.45)'
          : 'none',
        WebkitTapHighlightColor: 'transparent',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        if (tone !== 'iris') e.currentTarget.style.background = t.hoverBg
        if (tone === 'danger') e.currentTarget.style.color = t.hoverColor
      }}
      onMouseLeave={(e) => {
        if (tone !== 'iris') e.currentTarget.style.background = 'transparent'
        if (tone === 'danger') e.currentTarget.style.color = t.color
      }}
    >
      {children}
    </button>
  )
}
