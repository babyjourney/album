import { useRouter } from 'next/router'
import { useLanguage } from '../../contexts/LanguageContext'

// Bottom tab bar — visible only on mobile.
// Full-width edge-to-edge frosted glass bar (iOS classic pattern):
//  - icon + small label per tab
//  - active = iris color on both, no background pill
//  - safe-area-inset-bottom respected
export default function MobileTabBar({ onSearch, onSettings }) {
  const router = useRouter()
  const { t } = useLanguage()

  const isAlbum  = router.pathname === '/dashboard'
  const isSkills = router.pathname === '/skills'

  const tabs = [
    {
      key: 'album',
      label: t('album') || 'Album',
      icon: (active) => active ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5l4-5.5 3 3.5 4-5 3 7z"/>
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2.5"/>
          <circle cx="9" cy="9" r="1.6"/>
          <path d="m21 15-5-5-7 7"/>
        </svg>
      ),
      active: isAlbum,
      onClick: () => router.push('/dashboard'),
    },
    {
      key: 'skills',
      label: t('skills') || 'Skills',
      icon: (active) => active ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm-1.4 14.4-3.9-3.9 1.4-1.4 2.5 2.5 5.1-5.1 1.4 1.4-6.5 6.5z"/>
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      ),
      active: isSkills,
      onClick: () => router.push('/skills'),
    },
    onSearch && {
      key: 'search',
      label: t('search') || 'Search',
      icon: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
      active: false,
      onClick: onSearch,
    },
    onSettings && {
      key: 'settings',
      label: t('language') ? 'Setări' : 'Settings',
      icon: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
      active: false,
      onClick: onSettings,
    },
  ].filter(Boolean)

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      paddingTop: 6,
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      background: 'var(--glass-3)',
      backdropFilter: 'blur(28px) saturate(200%)',
      WebkitBackdropFilter: 'blur(28px) saturate(200%)',
      borderTop: '1px solid var(--glass-hairline)',
      boxShadow: '0 -1px 0 0 var(--glass-hairline)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={tab.onClick}
          aria-label={tab.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '6px 4px 4px',
            background: 'transparent',
            border: 'none',
            color: tab.active ? 'var(--accent-iris)' : 'var(--ink-2)',
            cursor: 'pointer',
            transition: 'color 220ms cubic-bezier(0.22,1,0.36,1)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {tab.icon(tab.active)}
          <span style={{
            fontSize: 10,
            fontWeight: tab.active ? 600 : 500,
            letterSpacing: '0.01em',
            lineHeight: 1.1,
          }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
