import { useState } from 'react'
import { useRouter } from 'next/router'
import SideSheet from './SideSheet'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { getSession, authenticatedFetch } from '../../lib/pinAuth'

export default function SettingsDrawer({ isOpen, onClose, onProfilePicture, onSignOut, columns, onColumnsChange }) {
  const { language, changeLanguage, t } = useLanguage()
  const { currentTheme, changeTheme, themes } = useTheme()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)

  // User-facing Data Export (baseline — included in every plan). Downloads a
  // JSON archive of the family's posts + metadata.
  const exportData = async () => {
    setExporting(true)
    try {
      const session = getSession()
      const res = await authenticatedFetch(`/api/photos/list?familyId=${session.familyId}&sort=oldest`)
      const data = await res.json()
      const archive = {
        exportedAt: new Date().toISOString(),
        family: { id: session.familyId, name: session.familyName },
        posts: (data.photos || []),
      }
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `babyjourney-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('export failed', e)
    } finally {
      setExporting(false)
    }
  }

  const goTo = (path) => { onClose && onClose(); router.push(path) }

  return (
    <SideSheet isOpen={isOpen} onClose={onClose} width={420}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid var(--glass-hairline)',
        flexShrink: 0,
      }}>
        <h2 className="text-section-title" style={{ fontSize: 22 }}>Settings</h2>
        <button onClick={onClose} className="btn-icon" aria-label="Close" style={{ width: 36, height: 36 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Section label={t('language') || 'Language'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { code: 'ro', flag: '🇷🇴', name: 'Română' },
              { code: 'ru', flag: '🇷🇺', name: 'Русский' },
              { code: 'en', flag: '🇺🇸', name: 'English' },
            ].map((lang) => {
              const active = language === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    flexDirection: 'column', display: 'flex', alignItems: 'center',
                    gap: 4, padding: '14px 8px',
                    borderRadius: 16, fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: active ? '#fff' : 'var(--ink-1)',
                    background: active ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'var(--glass-1)',
                    border: active ? '1px solid rgba(255,255,255,0.20)' : '1px solid var(--glass-hairline)',
                    boxShadow: active
                      ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(124,58,237,0.45)'
                      : 'inset 0 1px 0 0 var(--glass-hairline-strong)',
                    transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section label={t('theme') || 'Theme'}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'space-around' }}>
            {Object.values(themes).map((theme) => {
              const active = currentTheme === theme.name
              return (
                <button
                  key={theme.name}
                  onClick={() => changeTheme(theme.name)}
                  title={theme.label}
                  style={{
                    position: 'relative',
                    width: 64, height: 64,
                    borderRadius: '50%',
                    background: theme.swatch,
                    border: active ? '3px solid var(--accent-iris)' : '1px solid var(--glass-hairline)',
                    cursor: 'pointer',
                    transition: 'transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms',
                    boxShadow: active
                      ? '0 0 0 4px rgba(124,58,237,0.18), 0 8px 24px -6px rgba(0,0,0,0.18)'
                      : 'inset 0 1px 0 0 rgba(255,255,255,0.45), 0 6px 16px -6px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {active && (
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 22, fontWeight: 700,
                      textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {onColumnsChange && (
          <Section label={t('content') || 'CONTENT'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[2, 3].map((n) => {
                const active = columns === n
                return (
                  <button
                    key={n}
                    onClick={() => onColumnsChange(n)}
                    title={`${n} ${n === 1 ? 'coloană' : 'coloane'}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '16px 12px',
                      borderRadius: 16,
                      cursor: 'pointer',
                      background: active ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'var(--glass-1)',
                      color: active ? '#fff' : 'var(--ink-1)',
                      border: active ? '1px solid rgba(255,255,255,0.20)' : '1px solid var(--glass-hairline)',
                      boxShadow: active
                        ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(124,58,237,0.45)'
                        : 'inset 0 1px 0 0 var(--glass-hairline-strong)',
                      transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: n }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 12, height: 16, borderRadius: 3,
                            background: active ? 'rgba(255,255,255,0.92)' : 'var(--ink-2)',
                            opacity: active ? 1 : 0.7,
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {n} {n === 1 ? 'coloană' : 'coloane'}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        <Section label={t('tools') || 'Instrumente'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DrawerLink icon="🗓️" label="Vedere calendar" onClick={() => goTo('/calendar')} />
            <DrawerLink icon="📅" label="În această zi" onClick={() => goTo('/on-this-day')} />
            <DrawerLink
              icon="⬇️"
              label={exporting ? 'Se exportă…' : 'Exportă datele (JSON)'}
              onClick={exporting ? undefined : exportData}
            />
          </div>
        </Section>

        {onProfilePicture && (
          <Section label="Profile">
            <button
              onClick={onProfilePicture}
              className="btn-glass"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile picture
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </Section>
        )}
      </div>

      {onSignOut && (
        <div style={{
          padding: '16px 24px max(20px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--glass-hairline)',
          flexShrink: 0,
        }}>
          <button
            onClick={onSignOut}
            className="sheen"
            style={{
              display: 'inline-flex', width: '100%',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(220,38,38,0.10))',
              color: '#dc2626',
              border: '1px solid rgba(239,68,68,0.32)',
              borderRadius: 14, fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f87171, #dc2626)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(220,38,38,0.10))'
              e.currentTarget.style.color = '#dc2626'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('signOut') || 'Sign out'}
          </button>
        </div>
      )}
    </SideSheet>
  )
}

function DrawerLink({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="btn-glass" style={{ width: '100%', justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>{label}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label className="text-eyebrow" style={{ display: 'block', marginBottom: 12 }}>{label}</label>
      {children}
    </div>
  )
}
