import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import SideSheet from './SideSheet'
import { useLanguage, localeOf } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { getSession } from '../../lib/pinAuth'
import { exportFamilyArchive, fetchExportYears } from '../../lib/exportArchive'

export default function SettingsDrawer({ isOpen, onClose, onProfilePicture, onSignOut, columns, onColumnsChange }) {
  const { language, changeLanguage, t } = useLanguage()
  const { currentTheme, changeTheme, themes } = useTheme()
  const { showError, showSuccess } = useToast()
  const router = useRouter()

  // (Item 8) Export is a real .zip of the actual photos/videos/text, organized
  // into year folders — not a JSON file of URLs that nobody can use.
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState(null) // { stage, done, total }
  const [exportYear, setExportYear] = useState('all')
  const [years, setYears] = useState([])

  useEffect(() => {
    if (!isOpen) return
    const session = getSession()
    if (!session?.familyId) return
    fetchExportYears(session.familyId).then(setYears).catch(() => setYears([]))
  }, [isOpen])

  const exportData = async () => {
    const session = getSession()
    if (!session?.familyId) return

    setExporting(true)
    setExportStatus({ stage: 'fetching', done: 0, total: 0 })
    try {
      const result = await exportFamilyArchive({
        familyId: session.familyId,
        familyName: session.familyName,
        year: exportYear,
        t,
        locale: localeOf(language),
        onProgress: (stage, done, total) => setExportStatus({ stage, done, total }),
      })
      showSuccess(t('exportArchiveSuccess', { files: result.files, posts: result.posts }))
    } catch (e) {
      console.error('export failed', e)
      showError(e.message || t('exportFailedError'))
    } finally {
      setExporting(false)
      setExportStatus(null)
    }
  }

  const exportLabel = () => {
    if (!exportStatus) return t('exportDownloadAlbumZip')
    const { stage, done, total } = exportStatus
    if (stage === 'fetching') return t('exportPreparing')
    if (stage === 'downloading') return t('exportDownloadingPosts', { done, total })
    if (stage === 'zipping') return t('exportZippingFiles', { done, total })
    return t('done')
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
        <h2 className="text-section-title" style={{ fontSize: 22 }}>{t('settingsTitle')}</h2>
        <button onClick={onClose} className="btn-icon" aria-label={t('close')} style={{ width: 36, height: 36 }}>
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
          <Section label={t('settingsContent')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[2, 3].map((n) => {
                const active = columns === n
                return (
                  <button
                    key={n}
                    onClick={() => onColumnsChange(n)}
                    title={`${n} ${n === 1 ? t('columnSingular') : t('columnPlural')}`}
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
                      {n} {n === 1 ? t('columnSingular') : t('columnPlural')}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        <Section label={t('settingsTools')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DrawerLink icon="🗓️" label={t('calendarViewTitle')} onClick={() => goTo('/calendar')} />
            <DrawerLink icon="📅" label={t('onThisDayTitle')} onClick={() => goTo('/on-this-day')} />
          </div>
        </Section>

        {/* (Item 8) Album download — a .zip with a folder per year, containing
            the real photos/videos/text named
            [an.luna.zi][copii]_[titlu]_[nr].ext */}
        <Section label={t('exportSectionLabel')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select
              className="input-glass"
              value={exportYear}
              onChange={(e) => setExportYear(e.target.value)}
              disabled={exporting}
            >
              <option value="all">{t('exportWholeAlbum')}</option>
              {years.map((y) => (
                <option key={y} value={y}>{t('exportYearOption', { year: y })}</option>
              ))}
            </select>

            <button
              onClick={exporting ? undefined : exportData}
              disabled={exporting}
              className="btn-iris sheen"
              style={{ width: '100%', padding: '12px 16px', justifyContent: 'center' }}
            >
              {exportLabel()}
            </button>

            <p className="text-subtle" style={{ fontSize: 11.5, lineHeight: 1.4, margin: 0 }}>
              {t('exportHelpBefore')}{' '}<strong>postari.csv</strong>{' '}{t('exportHelpAfter')}
            </p>
          </div>
        </Section>

        {onProfilePicture && (
          <Section label={t('profileSectionLabel')}>
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
                {t('profilePictureAction')}
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
