import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

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
      
      // Check if multi-child is enabled
      const settingsResponse = await fetch(`/api/album-settings/get?familyId=${familyId}`)
      const settingsResult = await settingsResponse.json()
      
      if (settingsResponse.ok && settingsResult.settings?.is_multi_child) {
        setAlbumSettings(settingsResult.settings)
        
        // Fetch children
        const childrenResponse = await fetch(`/api/children/list?familyId=${familyId}`)
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

  // Don't render if multi-child is disabled or not visible
  if (!isVisible || !albumSettings?.is_multi_child || children.length === 0) {
    return null
  }

  return (
    <div 
      className="main-container"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: window.innerWidth <= 768 ? '12px' : '16px'
      }}
    >
      <div 
        className="card" 
        style={{ 
          padding: window.innerWidth <= 768 ? '8px' : '16px'
        }}
      >
        <h3 className="text-subtle" style={{ 
          fontSize: window.innerWidth <= 768 ? '12px' : '14px', 
          fontWeight: '600', 
          marginBottom: window.innerWidth <= 768 ? '8px' : '12px'
        }}>
          {t('filterByChild')}
        </h3>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: window.innerWidth <= 768 ? '8px' : '12px',
          alignItems: 'center'
        }}>
          {/* Show All Button */}
          <button
            onClick={() => onChildFilterChange(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: window.innerWidth <= 768 ? '6px' : '8px',
              padding: window.innerWidth <= 768 ? '6px 12px' : '8px 16px',
              borderRadius: window.innerWidth <= 768 ? '16px' : '20px',
              border: '1px solid var(--border-light)',
              backgroundColor: !selectedChildId ? 'var(--accent-blue)' : 'white',
              color: !selectedChildId ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseOver={(e) => {
              if (selectedChildId) {
                e.target.style.backgroundColor = 'var(--bg-gray)'
              }
            }}
            onMouseOut={(e) => {
              if (selectedChildId) {
                e.target.style.backgroundColor = 'white'
              }
            }}
          >
            <span style={{ fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>👶</span>
            {t('allPosts')}
          </button>

          {/* Children Filter Buttons */}
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => onChildFilterChange(child.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: window.innerWidth <= 768 ? '6px' : '8px',
                padding: window.innerWidth <= 768 ? '6px 12px' : '8px 16px',
                borderRadius: window.innerWidth <= 768 ? '16px' : '20px',
                border: '1px solid var(--border-light)',
                backgroundColor: selectedChildId === child.id ? 'var(--accent-blue)' : 'white',
                color: selectedChildId === child.id ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseOver={(e) => {
                if (selectedChildId !== child.id) {
                  e.target.style.backgroundColor = 'var(--bg-gray)'
                }
              }}
              onMouseOut={(e) => {
                if (selectedChildId !== child.id) {
                  e.target.style.backgroundColor = 'white'
                }
              }}
            >
              {/* Child Avatar */}
              <div style={{
                width: window.innerWidth <= 768 ? '20px' : '24px',
                height: window.innerWidth <= 768 ? '20px' : '24px',
                borderRadius: '50%',
                backgroundColor: selectedChildId === child.id ? 'rgba(255, 255, 255, 0.2)' : 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                fontWeight: '600',
                color: selectedChildId === child.id ? 'white' : 'white',
                backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
              </div>
              {child.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}