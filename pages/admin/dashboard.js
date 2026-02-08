import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAdminAuthenticated, clearAdminSession } from '../../lib/adminAuth'

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
  const [sortBy, setSortBy] = useState('name') // name, last_post, last_access, photos, storage
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  const [filterBy, setFilterBy] = useState('all') // all, active, inactive, no_posts
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
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
      const response = await fetch('/api/admin/dashboard-data')
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
      const response = await fetch('/api/admin/export-data')
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

  const handleToggleSuspend = async (familyId, currentSuspended) => {
    const newSuspended = !currentSuspended
    try {
      const response = await fetch('/api/admin/toggle-suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '8px',
                margin: 0
              }}>
                Dashboard Administrativ
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#64748b',
                margin: 0
              }}>
                Monitorizare și gestionare generale
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => router.push('/admin/children')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
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
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 4px 0' }}>Total Familii</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  {dashboardData.totalFamilies}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 4px 0' }}>Total Copii</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  {dashboardData.totalChildren}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#dcfce7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 4px 0' }}>Total Fotografii</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  {dashboardData.totalPhotos}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 4px 0' }}>Spațiu Utilizat</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  {formatFileSize(dashboardData.storageUsed)}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#ede9fe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          
          {/* Export Data Section */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Export Date
              </h2>
              <button
                onClick={handleExportData}
                disabled={exportLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: exportLoading ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exportLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
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
            
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Date exportate:
              </h4>
              <ul style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '16px' }}>
                <li>Nume familie și telefon</li>
                <li>Email-uri de contact</li>
                <li>Ultima accesare album</li>
                <li>Numărul de fotografii</li>
                <li>Data creării contului</li>
              </ul>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
              Activitate Recentă
            </h2>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {dashboardData.recentActivity.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '40px 0' }}>
                  Nu există activitate recentă
                </p>
              ) : (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} style={{
                    padding: '12px 0',
                    borderBottom: index < dashboardData.recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <p style={{ fontSize: '14px', color: '#1e293b', margin: '0 0 4px 0' }}>
                          {activity.description}
                        </p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                          {activity.family_name}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
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
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
              Familiile ({getFilteredAndSortedFamilies().length} din {dashboardData.familiesList.length})
            </h2>
          </div>

          {/* Filters and Search */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Search */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Căutare
              </label>
              <input
                type="text"
                placeholder="Nume familie sau telefon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Filtru
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">Toate familiile</option>
                <option value="active">Active (ultimele 30 zile)</option>
                <option value="inactive">Inactive (peste 30 zile)</option>
                <option value="no_posts">Fără postări</option>
                <option value="suspended">Suspendate</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Sortează după
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="name">Nume familie</option>
                <option value="last_post">Ultima postare</option>
                <option value="last_access">Ultima accesare</option>
                <option value="photos">Număr fotografii</option>
                <option value="storage">Spațiu folosit</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Ordine
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="asc">Crescător</option>
                <option value="desc">Descrescător</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th 
                    onClick={() => handleSort('name')}
                    style={{ 
                      textAlign: 'left', 
                      padding: '12px 8px', 
                      color: '#64748b', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none',
                      position: 'relative'
                    }}
                  >
                    Familie {getSortIcon('name')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                    Telefon
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                    Copii
                  </th>
                  <th 
                    onClick={() => handleSort('photos')}
                    style={{ 
                      textAlign: 'left', 
                      padding: '12px 8px', 
                      color: '#64748b', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Fotografii {getSortIcon('photos')}
                  </th>
                  <th 
                    onClick={() => handleSort('storage')}
                    style={{ 
                      textAlign: 'left', 
                      padding: '12px 8px', 
                      color: '#64748b', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Spațiu {getSortIcon('storage')}
                  </th>
                  <th 
                    onClick={() => handleSort('last_post')}
                    style={{ 
                      textAlign: 'left', 
                      padding: '12px 8px', 
                      color: '#64748b', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Ultima Postare {getSortIcon('last_post')}
                  </th>
                  <th 
                    onClick={() => handleSort('last_access')}
                    style={{ 
                      textAlign: 'left', 
                      padding: '12px 8px', 
                      color: '#64748b', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Ultima Accesare {getSortIcon('last_access')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                    Creat La
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedFamilies().map((family, index) => (
                  <tr key={family.id} style={{
                    borderBottom: index < getFilteredAndSortedFamilies().length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: family.days_since_last_post === null ? '#dc2626' : 
                                          family.days_since_last_post <= 7 ? '#22c55e' : 
                                          family.days_since_last_post <= 30 ? '#f59e0b' : '#6b7280',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          {family.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                              {family.name}
                            </p>
                            {family.is_suspended && (
                              <span style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.5px'
                              }}>
                                SUSPENDAT
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            ID: {family.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      {family.phone_number || 'Nu este setat'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      {family.children_count}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{family.photos_count}</span>
                        {family.photos_count > 0 && (
                          <span style={{
                            backgroundColor: family.photos_count >= 50 ? '#22c55e' : family.photos_count >= 10 ? '#f59e0b' : '#6b7280',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '10px'
                          }}>
                            {family.photos_count >= 50 ? 'Activ' : family.photos_count >= 10 ? 'Moderat' : 'Puțin'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      <div>
                        <div>{formatFileSize(family.storage_used || 0)}</div>
                        {family.storage_used > 0 && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            ~{Math.round((family.storage_used || 0) / (1024 * 1024))}MB
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      <div>
                        <div>{formatDate(family.last_post_date)}</div>
                        {family.days_since_last_post !== null && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: family.days_since_last_post <= 7 ? '#22c55e' : 
                                  family.days_since_last_post <= 30 ? '#f59e0b' : '#dc2626'
                          }}>
                            {family.days_since_last_post === 1 ? '1 zi' : `${family.days_since_last_post} zile`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      <div>
                        <div>{formatLastAccess(family.last_accessed, family.created_at)}</div>
                        {family.last_accessed && family.last_accessed !== family.created_at && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
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
                          <div style={{ fontSize: '12px', color: '#dc2626' }}>
                            Albumul nu a fost accesat
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1e293b' }}>
                      {formatDate(family.created_at)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => handleToggleSuspend(family.id, family.is_suspended)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: family.is_suspended ? '#22c55e' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {family.is_suspended ? 'Reactivează' : 'Suspendă'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {getFilteredAndSortedFamilies().length === 0 && dashboardData.familiesList.length > 0 && (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '40px 0' }}>
              Nu există familii care să corespundă criteriilor de filtrare
            </p>
          )}
          
          {dashboardData.familiesList.length === 0 && (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '40px 0' }}>
              Nu există familii înregistrate încă
            </p>
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                ✅ Export Reușit!
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                Datele au fost exportate cu succes. Fișierul CSV a fost descărcat și conține {exportData.length} înregistrări.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
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
      `}</style>
    </div>
  )
}