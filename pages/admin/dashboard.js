import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAdminAuthenticated, clearAdminSession, adminFetch } from '../../lib/adminAuth'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalFamilies: 0,
    totalUsers: 0,
    totalPhotos: 0,
    totalChildren: 0,
    recentActivity: [],
    familiesList: [],
    storageUsed: 0
  })
  const [exportData, setExportData] = useState([])
  const [exportLoading, setExportLoading] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [sortBy, setSortBy] = useState('name') // name, last_post, last_access, photos, storage, posts_30d, activity
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  const [filterBy, setFilterBy] = useState('all') // all, active, inactive, no_posts, very_active, sleeping, dead
  const [searchTerm, setSearchTerm] = useState('')
  // Per-family year selection for the year-scoped export dropdown.
  // Keyed by family id; defaults to the current year on first interaction.
  const [exportYearByFamily, setExportYearByFamily] = useState({})

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [])

  // Force dark theme for the admin panel (see admin/login.js for rationale).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const prev = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev)
      else document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  const checkAuth = () => {
    if (!isAdminAuthenticated()) {
      router.push('/admin/login')
      return
    }
    setLoading(false)
  }

  const fetchDashboardData = async () => {
    try {
      const response = await adminFetch('/api/admin/dashboard-data')
      const data = await response.json()

      if (response.ok) {
        setDashboardData(data)
      } else {
        console.error('Error fetching dashboard data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const response = await adminFetch('/api/admin/export-data')
      const data = await response.json()

      if (response.ok) {
        setExportData(data.exportData)

        // Create and download CSV
        const csvContent = createCSV(data.exportData)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', `family-export-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setShowExportModal(true)
      } else {
        alert('Eroare la exportarea datelor: ' + data.error)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Eroare la exportarea datelor')
    } finally {
      setExportLoading(false)
    }
  }

  // Download a JSON response straight from the admin export endpoints,
  // preserving the server-supplied filename when present.
  const downloadJsonResponse = async (response, fallbackName) => {
    const dispo = response.headers.get('content-disposition') || ''
    const match = /filename="?([^";]+)"?/i.exec(dispo)
    const filename = match ? match[1] : fallbackName
    const json = await response.json()
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportFamilyAll = async (family) => {
    try {
      const response = await adminFetch(`/api/admin/export-family-all?familyId=${family.id}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert('Eroare export: ' + (err.error || response.statusText))
        return
      }
      await downloadJsonResponse(response, `${family.name || 'familie'}-export-complet.json`)
    } catch (error) {
      console.error('Export family all error:', error)
      alert('Eroare la exportarea familiei')
    }
  }

  const handleExportFamilyYear = async (family, year) => {
    if (!year) return
    try {
      const response = await adminFetch(`/api/admin/export-family-year?familyId=${family.id}&year=${year}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert('Eroare export: ' + (err.error || response.statusText))
        return
      }
      await downloadJsonResponse(response, `${family.name || 'familie'}-${year}.json`)
    } catch (error) {
      console.error('Export family year error:', error)
      alert('Eroare la exportarea anului')
    }
  }

  // The dropdown lets the admin pick any year between the family's account
  // creation and the current year (inclusive). Used to scope EXPORT (per ani).
  const yearsForFamily = (family) => {
    const startYear = family.created_at
      ? new Date(family.created_at).getFullYear()
      : new Date().getFullYear()
    const endYear = new Date().getFullYear()
    const years = []
    for (let y = endYear; y >= startYear; y--) years.push(y)
    return years
  }

  const createCSV = (data) => {
    if (data.length === 0) return 'Nu există date pentru export'

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(','))
    ].join('\n')

    return csvContent
  }

  const handleLogout = () => {
    clearAdminSession()
    router.push('/admin/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Niciodată'
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLastAccess = (dateString, createdAt) => {
    if (!dateString) return 'Niciodată accesat'

    // Check if last_accessed is the same as created_at (from old migration)
    if (dateString === createdAt) {
      return 'Nu s-a accesat încă'
    }

    return formatDate(dateString)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Filter and sort families
  const getFilteredAndSortedFamilies = () => {
    let filtered = dashboardData.familiesList.filter(family => {
      // Search filter
      const matchesSearch = family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (family.phone_number && family.phone_number.includes(searchTerm))

      // Category filter
      let matchesFilter = true
      switch (filterBy) {
        case 'active':
          // Active: posted in last 30 days or accessed in last 7 days
          const now = new Date()
          const lastPost = family.last_post_date ? new Date(family.last_post_date) : null
          // Only consider real access (not the created_at value)
          const lastAccess = family.last_accessed && family.last_accessed !== family.created_at ?
                            new Date(family.last_accessed) : null
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

          matchesFilter = (lastPost && lastPost >= thirtyDaysAgo) || (lastAccess && lastAccess >= sevenDaysAgo)
          break
        case 'inactive':
          // Inactive: no posts in last 30 days and no access in last 7 days
          const nowInactive = new Date()
          const lastPostInactive = family.last_post_date ? new Date(family.last_post_date) : null
          // Only consider real access (not the created_at value)
          const lastAccessInactive = family.last_accessed && family.last_accessed !== family.created_at ?
                                    new Date(family.last_accessed) : null
          const thirtyDaysAgoInactive = new Date(nowInactive.getTime() - 30 * 24 * 60 * 60 * 1000)
          const sevenDaysAgoInactive = new Date(nowInactive.getTime() - 7 * 24 * 60 * 60 * 1000)

          matchesFilter = (!lastPostInactive || lastPostInactive < thirtyDaysAgoInactive) &&
                         (!lastAccessInactive || lastAccessInactive < sevenDaysAgoInactive)
          break
        case 'no_posts':
          matchesFilter = family.photos_count === 0
          break
        case 'suspended':
          matchesFilter = family.is_suspended === true
          break
        case 'very_active':
          matchesFilter = family.activity_code === 'very_active'
          break
        case 'sleeping':
          matchesFilter = family.activity_code === 'sleeping'
          break
        case 'dead':
          matchesFilter = family.activity_code === 'dead'
          break
        default:
          matchesFilter = true
      }

      return matchesSearch && matchesFilter
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'last_post':
          aValue = a.last_post_date ? new Date(a.last_post_date) : new Date(0)
          bValue = b.last_post_date ? new Date(b.last_post_date) : new Date(0)
          break
        case 'last_access':
          // Only consider real access times (not created_at values)
          aValue = a.last_accessed && a.last_accessed !== a.created_at ?
                   new Date(a.last_accessed) : new Date(0)
          bValue = b.last_accessed && b.last_accessed !== b.created_at ?
                   new Date(b.last_accessed) : new Date(0)
          break
        case 'photos':
          aValue = a.photos_count || 0
          bValue = b.photos_count || 0
          break
        case 'storage':
          aValue = a.storage_used || 0
          bValue = b.storage_used || 0
          break
        case 'posts_30d':
          aValue = a.posts_last_30d || 0
          bValue = b.posts_last_30d || 0
          break
        case 'activity':
          // Higher rank = more active. Stored on the row by the API.
          aValue = a.activity_rank ?? -1
          bValue = b.activity_rank ?? -1
          break
        case 'name':
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleChangePackage = async (familyId, newPackage) => {
    try {
      const response = await adminFetch('/api/admin/set-package', {
        method: 'POST',
        body: JSON.stringify({ familyId, package: newPackage })
      })
      const data = await response.json()

      if (response.ok) {
        setDashboardData(prev => ({
          ...prev,
          familiesList: prev.familiesList.map(f =>
            f.id === familyId ? { ...f, package: newPackage } : f
          )
        }))
      } else {
        alert('Eroare: ' + (data.error || 'Nu s-a putut actualiza pachetul'))
      }
    } catch (error) {
      console.error('Change package error:', error)
      alert('Eroare la actualizarea pachetului')
    }
  }

  const handleToggleSuspend = async (familyId, currentSuspended) => {
    const newSuspended = !currentSuspended
    try {
      const response = await adminFetch('/api/admin/toggle-suspend', {
        method: 'POST',
        body: JSON.stringify({ familyId, isSuspended: newSuspended })
      })
      const data = await response.json()

      if (response.ok) {
        setDashboardData(prev => ({
          ...prev,
          familiesList: prev.familiesList.map(f =>
            f.id === familyId ? { ...f, is_suspended: newSuspended } : f
          )
        }))
      } else {
        alert('Eroare: ' + (data.error || 'Nu s-a putut actualiza'))
      }
    } catch (error) {
      console.error('Toggle suspend error:', error)
      alert('Eroare la actualizarea stării')
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div data-theme="dark" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '3px solid var(--glass-hairline)',
          borderTopColor: 'var(--accent-iris)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  const statAccents = [
    { grad: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(124,58,237,0.10))', stroke: 'var(--accent-iris)' },
    { grad: 'linear-gradient(135deg, rgba(52,211,153,0.35), rgba(52,211,153,0.10))', stroke: 'var(--accent-mint)' },
    { grad: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.10))', stroke: 'var(--accent-amber)' },
    { grad: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(6,182,212,0.10))', stroke: 'var(--accent-aqua)' },
  ]

  return (
    <div data-theme="dark" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>

        {/* Header */}
        <div className="glass" style={{
          padding: '22px 26px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 8px 24px -8px rgba(124,58,237,0.55)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-page-title" style={{ marginBottom: '2px' }}>
                Dashboard Administrativ
              </h1>
              <p className="text-subtle" style={{ margin: 0 }}>
                Monitorizare și gestionare generale
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/admin/children')}
              className="btn-glass"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Gestionare Familii
            </button>

            <button
              onClick={handleLogout}
              className="btn-glass"
              style={{
                background: 'linear-gradient(135deg, #f87171, #dc2626)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 8px 24px -8px rgba(220,38,38,0.55)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'Total Familii', value: dashboardData.totalFamilies, accent: statAccents[0],
              icon: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>) },
            { label: 'Total Copii', value: dashboardData.totalChildren, accent: statAccents[1],
              icon: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></>) },
            { label: 'Total Fotografii', value: dashboardData.totalPhotos, accent: statAccents[2],
              icon: (<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></>) },
            { label: 'Spațiu Utilizat', value: formatFileSize(dashboardData.storageUsed), accent: statAccents[3],
              icon: (<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>) }
          ].map((stat, i) => (
            <div key={i} className="card-glass" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <p className="text-eyebrow" style={{ marginBottom: '8px' }}>{stat.label}</p>
                  <p className="text-display nums" style={{ fontSize: '28px', margin: 0 }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: stat.accent.grad,
                  border: '1px solid var(--glass-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stat.accent.stroke} strokeWidth="2">
                    {stat.icon}
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Growth Analytics — Tasks #10/#11.
            Shows trendlines for the past 30 days. Sparkline-based so we don't
            need an external charting lib. */}
        {dashboardData.analytics && (
          <div className="card-glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 className="text-section-title" style={{ margin: 0 }}>
                Growth Analytics
              </h2>
              <span className="text-tertiary" style={{ fontSize: '12.5px' }}>
                Ultimele 30 zile
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}>
              <AnalyticsCard
                eyebrow="Familii noi (30 zile)"
                value={dashboardData.analytics.newFamiliesLast30d}
                sub={`${dashboardData.analytics.newFamiliesLast7d} în ultimele 7 zile`}
                series={dashboardData.analytics.newFamiliesPerDay.map(d => d.count)}
                stroke="var(--accent-iris)"
                fill="rgba(124, 58, 237, 0.18)"
              />
              <AnalyticsCard
                eyebrow="Total familii (cumulativ)"
                value={dashboardData.totalFamilies}
                sub={`+${dashboardData.analytics.newFamiliesLast30d} luna aceasta`}
                series={dashboardData.analytics.familyGrowth.map(d => d.total)}
                stroke="var(--accent-mint)"
                fill="rgba(52, 211, 153, 0.18)"
              />
              <AnalyticsCard
                eyebrow="Storage (cumulativ)"
                value={formatFileSize(dashboardData.storageUsed)}
                sub="creștere reală"
                series={dashboardData.analytics.storageGrowth.map(d => d.bytes)}
                stroke="var(--accent-amber)"
                fill="rgba(245, 158, 11, 0.18)"
                isMonetary={false}
              />
              <AnalyticsCard
                eyebrow="DAU (azi)"
                value={dashboardData.analytics.dauToday}
                sub="utilizatori activi azi"
                series={dashboardData.analytics.dailyActiveUsers.map(d => d.count)}
                stroke="var(--accent-aqua)"
                fill="rgba(6, 182, 212, 0.18)"
              />
              <AnalyticsCard
                eyebrow="Retention rate (30z)"
                value={`${dashboardData.analytics.retentionRate}%`}
                sub="familii cu postări recente"
                series={null}
                stroke="var(--accent-peach)"
                fill="rgba(251, 113, 133, 0.18)"
                bigValue
              />
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>

          {/* Export Data Section */}
          <div className="card-glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 className="text-section-title" style={{ margin: 0 }}>
                Export Date
              </h2>
              <button
                onClick={handleExportData}
                disabled={exportLoading}
                className="btn-iris sheen"
                style={{ padding: '10px 16px' }}
              >
                {exportLoading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Exportă...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
            </div>

            <div className="glass-soft" style={{ padding: '16px 18px' }}>
              <h4 className="text-eyebrow" style={{ marginBottom: '10px' }}>
                Date exportate
              </h4>
              <ul className="text-subtle" style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.7 }}>
                <li>Nume familie și telefon</li>
                <li>Email-uri de contact</li>
                <li>Ultima accesare album</li>
                <li>Numărul de fotografii</li>
                <li>Data creării contului</li>
              </ul>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-glass" style={{ padding: '24px' }}>
            <h2 className="text-section-title" style={{ marginBottom: '16px' }}>
              Activitate Recentă
            </h2>

            <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
              {dashboardData.recentActivity.length === 0 ? (
                <p className="text-subtle" style={{ textAlign: 'center', margin: '40px 0' }}>
                  Nu există activitate recentă
                </p>
              ) : (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} style={{
                    padding: '14px 0',
                    borderBottom: index < dashboardData.recentActivity.length - 1 ? '1px solid var(--glass-hairline)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p className="text-body" style={{ margin: '0 0 4px 0' }}>
                          {activity.description}
                        </p>
                        <p className="text-tertiary" style={{ margin: 0 }}>
                          {activity.family_name}
                        </p>
                      </div>
                      <span className="text-tertiary nums" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Families List */}
        <div className="card-glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <h2 className="text-section-title" style={{ margin: 0 }}>
              Familiile <span className="text-subtle nums" style={{ fontWeight: 500 }}>({getFilteredAndSortedFamilies().length} din {dashboardData.familiesList.length})</span>
            </h2>
          </div>

          {/* Filters and Search */}
          <div className="glass-soft" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
            padding: '18px'
          }}>
            {/* Search */}
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                Căutare
              </label>
              <input
                type="text"
                placeholder="Nume familie sau telefon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-glass"
                style={{ padding: '10px 14px', fontSize: '14px' }}
              />
            </div>

            {/* Filter */}
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                Filtru
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="input-glass"
                style={{ padding: '10px 14px', fontSize: '14px' }}
              >
                <option value="all">Toate familiile</option>
                <option value="active">Active (ultimele 30 zile)</option>
                <option value="inactive">Inactive (peste 30 zile)</option>
                <option value="no_posts">Fără postări</option>
                <option value="suspended">Suspendate</option>
                <option value="very_active">🔥 Very active</option>
                <option value="sleeping">😴 Sleeping</option>
                <option value="dead">💀 Dead</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                Sortează după
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-glass"
                style={{ padding: '10px 14px', fontSize: '14px' }}
              >
                <option value="name">Nume familie</option>
                <option value="last_post">Ultima postare</option>
                <option value="last_access">Ultima accesare</option>
                <option value="photos">Număr fotografii</option>
                <option value="storage">Spațiu folosit</option>
                <option value="posts_30d">Postări 30 zile</option>
                <option value="activity">Activitate (emoji)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                Ordine
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-glass"
                style={{ padding: '10px 14px', fontSize: '14px' }}
              >
                <option value="asc">Crescător</option>
                <option value="desc">Descrescător</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-eyebrow"
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Familie {getSortIcon('name')}
                  </th>
                  <th className="text-eyebrow" style={{ textAlign: 'left', padding: '8px 12px' }}>
                    Telefon
                  </th>
                  <th className="text-eyebrow" style={{ textAlign: 'left', padding: '8px 12px' }}>
                    Copii
                  </th>
                  <th
                    onClick={() => handleSort('photos')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Fotografii {getSortIcon('photos')}
                  </th>
                  <th
                    onClick={() => handleSort('storage')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Spațiu {getSortIcon('storage')}
                  </th>
                  <th
                    onClick={() => handleSort('posts_30d')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                    title="Numărul de postări din ultimele 30 de zile"
                  >
                    Postări 30z {getSortIcon('posts_30d')}
                  </th>
                  <th
                    onClick={() => handleSort('activity')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                    title="🔥 very active · 🙂 active · 😴 sleeping · 💀 dead"
                  >
                    Activ {getSortIcon('activity')}
                  </th>
                  <th
                    onClick={() => handleSort('last_post')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Ultima Postare {getSortIcon('last_post')}
                  </th>
                  <th
                    onClick={() => handleSort('last_access')}
                    className="text-eyebrow"
                    style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Ultima Accesare {getSortIcon('last_access')}
                  </th>
                  <th className="text-eyebrow" style={{ textAlign: 'left', padding: '8px 12px' }}>
                    Creat La
                  </th>
                  <th className="text-eyebrow" style={{ textAlign: 'left', padding: '8px 12px' }}>
                    Pachet
                  </th>
                  <th className="text-eyebrow" style={{ textAlign: 'left', padding: '8px 12px' }}>
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedFamilies().map((family, index) => {
                  const dotColor = family.days_since_last_post === null ? 'var(--accent-red)' :
                                   family.days_since_last_post <= 7 ? 'var(--accent-mint)' :
                                   family.days_since_last_post <= 30 ? 'var(--accent-amber)' : 'var(--ink-3)'
                  const dotGrad = family.days_since_last_post === null ? 'linear-gradient(135deg, #f87171, #dc2626)' :
                                  family.days_since_last_post <= 7 ? 'linear-gradient(135deg, #34d399, #10b981)' :
                                  family.days_since_last_post <= 30 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #94a3b8, #64748b)'
                  return (
                    <tr key={family.id} className="glass-soft" style={{ transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)' }}>
                      <td style={{ padding: '14px 12px', borderRadius: '14px 0 0 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: dotGrad,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '700',
                            border: '1px solid var(--glass-hairline-strong)',
                            flexShrink: 0
                          }}>
                            {family.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <p className="text-body" style={{ fontWeight: 600, margin: 0 }}>
                                {family.name}
                              </p>
                              {family.is_suspended && (
                                <span className="glass-pill" style={{
                                  padding: '3px 10px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  letterSpacing: '0.08em',
                                  color: 'var(--accent-amber)',
                                  borderColor: 'rgba(245,158,11,0.45)',
                                  background: 'rgba(245,158,11,0.12)'
                                }}>
                                  SUSPENDAT
                                </span>
                              )}
                            </div>
                            <p className="text-tertiary nums" style={{ margin: 0 }}>
                              ID: {family.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-body nums" style={{ padding: '14px 12px' }}>
                        {family.phone_number || 'Nu este setat'}
                      </td>
                      <td className="text-body nums" style={{ padding: '14px 12px' }}>
                        {family.children_count}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="text-body nums">{family.photos_count}</span>
                          {family.photos_count > 0 && (
                            <span className="glass-pill" style={{
                              padding: '3px 10px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: family.photos_count >= 50 ? 'var(--accent-mint)' : family.photos_count >= 10 ? 'var(--accent-amber)' : 'var(--ink-2)',
                              borderColor: family.photos_count >= 50 ? 'rgba(52,211,153,0.45)' : family.photos_count >= 10 ? 'rgba(245,158,11,0.45)' : 'var(--glass-hairline)',
                              background: family.photos_count >= 50 ? 'rgba(52,211,153,0.12)' : family.photos_count >= 10 ? 'rgba(245,158,11,0.12)' : 'var(--glass-1)'
                            }}>
                              {family.photos_count >= 50 ? 'Activ' : family.photos_count >= 10 ? 'Moderat' : 'Puțin'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div className="text-body nums">{formatFileSize(family.storage_used || 0)}</div>
                        {family.storage_used > 0 && (
                          <div className="text-tertiary nums">
                            ~{Math.round((family.storage_used || 0) / (1024 * 1024))}MB
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div className="text-body nums" style={{ fontWeight: 600 }}>
                          {family.posts_last_30d || 0}
                        </div>
                        <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                          {family.posts_last_30d > 0 ? 'postări' : 'fără postări'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span
                          title={
                            family.activity_code === 'very_active' ? 'Very active — postare recentă' :
                            family.activity_code === 'active' ? 'Active — postare în ultima lună' :
                            family.activity_code === 'sleeping' ? 'Sleeping — fără postări de peste 30 zile' :
                            family.activity_code === 'dead' ? 'Dead — fără postări de peste 90 zile' :
                            ''
                          }
                          style={{
                            fontSize: '24px',
                            display: 'inline-block',
                            filter: family.activity_code === 'dead' ? 'grayscale(0.4)' : 'none',
                          }}
                          aria-label={family.activity_code}
                        >
                          {family.activity_emoji || '😴'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div className="text-body nums">{formatDate(family.last_post_date)}</div>
                        {family.days_since_last_post !== null && (
                          <div className="nums" style={{
                            fontSize: '12.5px',
                            color: dotColor
                          }}>
                            {family.days_since_last_post === 1 ? '1 zi' : `${family.days_since_last_post} zile`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div className="text-body nums">{formatLastAccess(family.last_accessed, family.created_at)}</div>
                        {family.last_accessed && family.last_accessed !== family.created_at && (
                          <div className="text-tertiary nums">
                            {(() => {
                              const lastAccess = new Date(family.last_accessed)
                              const today = new Date()
                              const diffTime = today - lastAccess
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                              return diffDays === 1 ? '1 zi' : `${diffDays} zile`
                            })()}
                          </div>
                        )}
                        {(!family.last_accessed || family.last_accessed === family.created_at) && (
                          <div className="nums" style={{ fontSize: '12.5px', color: 'var(--accent-red)' }}>
                            Albumul nu a fost accesat
                          </div>
                        )}
                      </td>
                      <td className="text-body nums" style={{ padding: '14px 12px' }}>
                        {formatDate(family.created_at)}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {(() => {
                          const currentPkg = family.package || 'free'
                          const isPremium = currentPkg === 'premium'
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                              <span className="glass-pill" style={{
                                padding: '3px 10px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                color: isPremium ? 'var(--accent-iris)' : 'var(--ink-2)',
                                borderColor: isPremium ? 'rgba(124,58,237,0.45)' : 'var(--glass-hairline)',
                                background: isPremium ? 'rgba(124,58,237,0.12)' : 'var(--glass-1)'
                              }}>
                                {isPremium ? 'PREMIUM' : 'FREE'}
                              </span>
                              <select
                                value={currentPkg}
                                onChange={(e) => {
                                  const next = e.target.value
                                  if (next === currentPkg) return
                                  handleChangePackage(family.id, next)
                                }}
                                className="input-glass"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  minWidth: '110px'
                                }}
                              >
                                <option value="free">Free</option>
                                <option value="premium">Premium</option>
                              </select>
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '14px 12px', borderRadius: '0 14px 14px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
                          <button
                            onClick={() => handleToggleSuspend(family.id, family.is_suspended)}
                            style={{
                              padding: '7px 14px',
                              background: family.is_suspended
                                ? 'linear-gradient(135deg, #34d399, #10b981)'
                                : 'linear-gradient(135deg, #f87171, #dc2626)',
                              color: 'white',
                              border: '1px solid rgba(255,255,255,0.18)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              boxShadow: family.is_suspended
                                ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(16,185,129,0.50)'
                                : 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(220,38,38,0.50)',
                              transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), filter 180ms cubic-bezier(0.22,1,0.36,1)'
                            }}
                          >
                            {family.is_suspended ? 'Reactivează' : 'Suspendă'}
                          </button>

                          <button
                            onClick={() => handleExportFamilyAll(family)}
                            title="Exportă tot conținutul familiei (poze, video, texte, metadate) — pentru migrare sau încheiere contract"
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                              color: 'white',
                              border: '1px solid rgba(255,255,255,0.18)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(67,56,202,0.50)',
                            }}
                          >
                            ⬇ EXPORT all
                          </button>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select
                              value={exportYearByFamily[family.id] ?? new Date().getFullYear()}
                              onChange={(e) => setExportYearByFamily(prev => ({ ...prev, [family.id]: e.target.value }))}
                              className="input-glass"
                              style={{ padding: '5px 8px', fontSize: '11.5px', flex: '0 0 auto' }}
                              title="An pentru export"
                            >
                              {yearsForFamily(family).map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleExportFamilyYear(family, exportYearByFamily[family.id] ?? new Date().getFullYear())}
                              title="Exportă doar postările din anul selectat — pentru album cadou sau contra plată la sfârșit de an"
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                background: 'linear-gradient(135deg, #06b6d4, #0e7490)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.18)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px rgba(14,116,144,0.50)',
                              }}
                            >
                              ⬇ EXPORT
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {getFilteredAndSortedFamilies().length === 0 && dashboardData.familiesList.length > 0 && (
            <p className="text-subtle" style={{ textAlign: 'center', margin: '40px 0' }}>
              Nu există familii care să corespundă criteriilor de filtrare
            </p>
          )}

          {dashboardData.familiesList.length === 0 && (
            <p className="text-subtle" style={{ textAlign: 'center', margin: '40px 0' }}>
              Nu există familii înregistrate încă
            </p>
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="modal-scrim">
            <div className="modal-glass" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-icon"
                style={{ position: 'absolute', top: 14, right: 14 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(52,211,153,0.30), rgba(52,211,153,0.10))',
                border: '1px solid rgba(52,211,153,0.40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-section-title" style={{ marginBottom: '10px' }}>
                Export Reușit
              </h3>
              <p className="text-subtle" style={{ marginBottom: '22px' }}>
                Datele au fost exportate cu succes. Fișierul CSV a fost descărcat și conține <span className="nums" style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{exportData.length}</span> înregistrări.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-iris sheen"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        tbody tr:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}

// Inline sparkline-style card used by the Growth Analytics section.
// Stays in this file (no new file) since it's only used here. Pure SVG —
// no charting dep.
function AnalyticsCard({ eyebrow, value, sub, series, stroke, fill, bigValue }) {
  return (
    <div className="glass-soft" style={{ padding: '16px 18px', borderRadius: '16px' }}>
      <p className="text-eyebrow" style={{ marginBottom: '8px' }}>{eyebrow}</p>
      <p className="text-display nums" style={{ fontSize: bigValue ? '32px' : '24px', margin: '0 0 6px' }}>
        {value}
      </p>
      {sub && (
        <p className="text-tertiary" style={{ margin: 0, fontSize: '12px' }}>
          {sub}
        </p>
      )}
      {series && series.length > 1 && (
        <div style={{ marginTop: '10px' }}>
          <Sparkline values={series} stroke={stroke} fill={fill} />
        </div>
      )}
    </div>
  )
}

function Sparkline({ values, stroke = 'var(--accent-iris)', fill = 'rgba(124,58,237,0.18)', width = 200, height = 44 }) {
  if (!values || values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1 || 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })
  const pathD = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: height, display: 'block' }}>
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
