import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { authenticatedFetch } from '../lib/pinAuth'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export default function ChildrenFilter({
  familyId,
  isVisible = false,
  selectedChildId,
  onChildFilterChange
}) {
  const { t } = useLanguage()
  const [children, setChildren] = useState([])
  const [albumSettings, setAlbumSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (familyId && isVisible) {
      fetchData()
    }
  }, [familyId, isVisible])

  const fetchData = async () => {
    try {
      setLoading(true)

      const settingsResponse = await authenticatedFetch(`/api/album-settings/get?familyId=${familyId}`)
      const settingsResult = await settingsResponse.json()

      if (settingsResponse.ok && settingsResult.settings?.is_multi_child) {
        setAlbumSettings(settingsResult.settings)

        const childrenResponse = await authenticatedFetch(`/api/children/list?familyId=${familyId}`)
        const childrenResult = await childrenResponse.json()

        if (childrenResponse.ok) {
          setChildren(childrenResult.children)
        }
      } else {
        setAlbumSettings({ is_multi_child: false })
      }
    } catch (error) {
      console.error('Error fetching children data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible || !albumSettings?.is_multi_child || children.length === 0) {
    return null
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const renderPill = ({ key, active, onClick, avatar, label }) => (
    <button
      key={key}
      onClick={onClick}
      className={active ? 'category-pill category-pill--selected' : 'category-pill'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMobile ? '8px' : '10px',
        padding: isMobile ? '6px 14px 6px 6px' : '7px 16px 7px 7px',
        fontSize: isMobile ? '13px' : '14px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        color: active ? '#fff' : 'var(--ink-1)',
        transform: active ? 'scale(1.04)' : 'scale(1)',
        transition: `all 220ms ${EASE}`,
        boxShadow: active
          ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 22px -6px rgba(124,58,237,0.55)'
          : 'inset 0 1px 0 0 var(--glass-hairline-strong)'
      }}
    >
      {avatar}
      <span>{label}</span>
    </button>
  )

  return (
    <div
      className="main-container"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: isVisible ? 1 : 0,
        transition: `all 280ms ${EASE}`,
        marginBottom: isMobile ? '12px' : '16px'
      }}
    >
      <div
        className="card-glass"
        style={{
          padding: isMobile ? '12px' : '16px',
          borderRadius: '20px'
        }}
      >
        <h3 style={{
          fontSize: isMobile ? '11px' : '12px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: isMobile ? '10px' : '12px',
          margin: `0 0 ${isMobile ? '10px' : '12px'} 0`
        }}>
          {t('filterByChild')}
        </h3>

        <div style={{
          display: 'flex',
          gap: isMobile ? '8px' : '10px',
          alignItems: 'center',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
          {renderPill({
            key: 'all',
            active: !selectedChildId,
            onClick: () => onChildFilterChange(null),
            avatar: (
              <span style={{
                width: isMobile ? 24 : 28,
                height: isMobile ? 24 : 28,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '14px' : '16px',
                background: !selectedChildId
                  ? 'rgba(255,255,255,0.18)'
                  : 'var(--glass-1)',
                border: '1px solid var(--glass-hairline)'
              }}>👶</span>
            ),
            label: t('allPosts')
          })}

          {children.map((child) => {
            const active = selectedChildId === child.id
            return renderPill({
              key: child.id,
              active,
              onClick: () => onChildFilterChange(child.id),
              avatar: (
                <span
                  style={{
                    width: isMobile ? 24 : 28,
                    height: isMobile ? 24 : 28,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 700,
                    color: '#fff',
                    background: child.profile_picture_url
                      ? 'transparent'
                      : 'linear-gradient(135deg, var(--accent-iris), #6d28d9)',
                    backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--glass-hairline-strong)',
                    boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.35)' : 'none'
                  }}
                >
                  {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                </span>
              ),
              label: child.name
            })
          })}
        </div>
      </div>
    </div>
  )
}
