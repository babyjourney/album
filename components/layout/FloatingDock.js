import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useLanguage } from '../../contexts/LanguageContext'

// Top-center floating dock — the only chrome on every page.
// Contains: home, accentuated skills + family-tree pills, optional multi-child
// switcher, title pill, search, settings, sign-out.
export default function FloatingDock({
  albumTitle,
  onSearch,
  onSettings,
  onSignOut,
  children = [],
  selectedChildId = null,
  onSelectChild,
}) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showChildPopover, setShowChildPopover] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const isSkillsPage = router.pathname === '/skills'
  const isFamilyTreePage = router.pathname === '/family-tree'
  const childPopoverRef = useRef(null)

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

  useEffect(() => {
    if (!showChildPopover) return
    const onClick = (e) => {
      if (childPopoverRef.current && !childPopoverRef.current.contains(e.target)) {
        setShowChildPopover(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showChildPopover])

  const showTitle = albumTitle && !isMobile && scrolled
  const hasMultipleChildren = children && children.length > 0
  const currentChild = hasMultipleChildren && selectedChildId
    ? children.find((c) => c.id === selectedChildId)
    : null

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

        <DockAccentPill
          onClick={() => router.push(isSkillsPage ? '/dashboard' : '/skills')}
          label={t('skills') || 'Abilități'}
          active={isSkillsPage}
          isMobile={isMobile}
          gradient="linear-gradient(135deg, #34d399, #059669)"
          glow="rgba(16,185,129,0.45)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </DockAccentPill>

        <DockAccentPill
          onClick={() => router.push(isFamilyTreePage ? '/dashboard' : '/family-tree')}
          label={t('familyTree') || 'Familie'}
          active={isFamilyTreePage}
          isMobile={isMobile}
          gradient="linear-gradient(135deg, #fb923c, #c2410c)"
          glow="rgba(234,88,12,0.45)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4" r="2"/>
            <circle cx="5" cy="17" r="2"/>
            <circle cx="19" cy="17" r="2"/>
            <path d="M12 6v3"/>
            <path d="M5 15v-2h14v2"/>
            <path d="M12 9v4"/>
          </svg>
        </DockAccentPill>

        {hasMultipleChildren && onSelectChild && (
          <div style={{ position: 'relative' }} ref={childPopoverRef}>
            <button
              onClick={() => setShowChildPopover((s) => !s)}
              title={currentChild ? currentChild.name : (t('allPosts') || 'Toți copiii')}
              aria-label="Switch child"
              style={{
                width: 38, height: 38, padding: 2,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.20)',
                background: selectedChildId === null
                  ? 'linear-gradient(135deg, #a78bfa, #6d28d9)'
                  : 'var(--glass-1)',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30)',
                transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {currentChild?.profile_picture_url ? (
                <img
                  src={currentChild.profile_picture_url}
                  alt={currentChild.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : selectedChildId === null ? (
                <span style={{ fontSize: 16, color: '#fff' }}>👶</span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>
                  {(currentChild?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            {showChildPopover && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: 220,
                  padding: 10,
                  background: 'var(--glass-3)',
                  backdropFilter: 'blur(28px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                  border: '1px solid var(--glass-hairline-strong)',
                  borderRadius: 20,
                  boxShadow: '0 18px 50px -16px rgba(15,15,30,0.30), inset 0 1px 0 0 var(--glass-hairline-strong)',
                  zIndex: 90,
                  animation: 'dock-pop 220ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <button
                  onClick={() => { onSelectChild(null); setShowChildPopover(false) }}
                  style={popoverItemStyle(selectedChildId === null)}
                >
                  <span style={{ fontSize: 18 }}>👶</span>
                  <span>{t('allPosts') || 'Toate'}</span>
                </button>
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onSelectChild(c.id); setShowChildPopover(false) }}
                    style={popoverItemStyle(selectedChildId === c.id)}
                  >
                    {c.profile_picture_url ? (
                      <img
                        src={c.profile_picture_url}
                        alt={c.name}
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a78bfa, #6d28d9)',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{c.name}</span>
                  </button>
                ))}
                <style jsx>{`
                  @keyframes dock-pop {
                    from { opacity: 0; transform: translate(-50%, -6px); }
                    to   { opacity: 1; transform: translate(-50%, 0); }
                  }
                `}</style>
              </div>
            )}
          </div>
        )}

        {/* Title pill — desktop only, hides on scroll */}
        {showTitle && (
          <div style={{
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.005em',
            maxWidth: 200,
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

const popoverItemStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid transparent',
  background: active ? 'var(--glass-1)' : 'transparent',
  color: 'var(--ink-1)',
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 160ms cubic-bezier(0.22,1,0.36,1)',
})

function DockAccentPill({ children, onClick, label, active, isMobile, gradient, glow }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        height: 38,
        minHeight: 38,
        padding: isMobile ? '0 10px' : '0 14px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMobile ? 0 : 6,
        background: gradient,
        color: '#fff',
        border: active ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.18)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms, filter 220ms',
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 16px -6px ${glow}`,
        filter: active ? 'brightness(1.06)' : 'brightness(1)',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = `inset 0 1px 0 0 rgba(255,255,255,0.30), 0 10px 22px -6px ${glow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = `inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 16px -6px ${glow}`
      }}
    >
      {children}
      {!isMobile && <span>{label}</span>}
    </button>
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
