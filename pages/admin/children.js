import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { useLanguage } from '../../contexts/LanguageContext'
import { isAdminAuthenticated, clearAdminSession, adminFetch, parseAdminResponse } from '../../lib/adminAuth'
import { TIER_ORDER, TIERS } from '../../lib/tiers'

export default function AdminDashboard() {
  const { language, t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([])
  const [albumSettings, setAlbumSettings] = useState(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [newChild, setNewChild] = useState({
    name: '',
    birthDate: '',
    profilePictureUrl: ''
  })
  const [uploading, setUploading] = useState(false)

  // Family setup states
  const [showFamilySetup, setShowFamilySetup] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [parentName, setParentName] = useState('')
  const [childName, setChildName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  // Email is optional but recommended — enables email-channel OTP for
  // forgot-PIN / 2FA login (see lib/notifications.js).
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState('starter')
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState(null)

  // Album title display state
  const [currentTitle, setCurrentTitle] = useState('Family Album')

  // Family management states
  const [allFamilies, setAllFamilies] = useState([])
  const [selectedFamilyId, setSelectedFamilyId] = useState('')


  useEffect(() => {
    checkAuth()
    fetchAllFamilies()
  }, [])

  // Admin routes are pinned to dark by ThemeProvider.

  useEffect(() => {
    if (selectedFamilyId) {
      fetchFamilyData(selectedFamilyId)
    }
  }, [selectedFamilyId])

  const checkAuth = () => {
    // Check if admin is authenticated
    if (!isAdminAuthenticated()) {
      router.push('/admin/login')
      return
    }
    setLoading(false)
  }

  // Fetch all families via the admin API (service-role bypasses RLS).
  // We previously went direct to supabase.from('families') from the browser,
  // which the strict RLS policy correctly blocks under the anon key. The
  // /api/admin/families/list endpoint runs server-side with the admin token.
  const fetchAllFamilies = async () => {
    try {
      const response = await adminFetch('/api/admin/families/list')
      const parsed = await parseAdminResponse(response)
      if (!parsed.ok) {
        console.error('Families list failed:', parsed.error)
        setAllFamilies([])
        return
      }
      setAllFamilies(parsed.data.families || [])
    } catch (error) {
      console.error('Error fetching families:', error)
      setAllFamilies([])
    }
  }

  const fetchFamilyData = async (familyId) => {
    try {
      // Fetch album settings
      const settingsResponse = await adminFetch(`/api/album-settings/get?familyId=${familyId}`)
      const settingsResult = await settingsResponse.json()

      if (settingsResponse.ok) {
        setAlbumSettings(settingsResult.settings)
      }

      // Fetch children
      const childrenResponse = await adminFetch(`/api/children/list?familyId=${familyId}`)
      const childrenResult = await childrenResponse.json()

      if (childrenResponse.ok) {
        setChildren(childrenResult.children)
      }

      // Fetch current album title
      const titleResponse = await adminFetch(`/api/album-settings/get-title?familyId=${familyId}`)
      const titleResult = await titleResponse.json()

      if (titleResponse.ok) {
        setCurrentTitle(titleResult.title)
      }
    } catch (error) {
      console.error('Error fetching family data:', error)
    }
  }

  // Remove fetchData since this is now a standalone admin tool
  // Data will be fetched when needed for specific families

  const toggleMultiChild = async () => {
    if (!selectedFamilyId) {
      alert('Vă rugăm să selectați o familie')
      return
    }

    try {
      const response = await adminFetch('/api/album-settings/update', {
        method: 'PUT',
        body: JSON.stringify({
          familyId: selectedFamilyId,
          isMultiChild: !albumSettings?.is_multi_child
        })
      })

      const result = await response.json()

      if (response.ok) {
        setAlbumSettings(result.settings)
        alert(`Setările au fost actualizate! Multi-copil este acum ${result.settings.is_multi_child ? 'activat' : 'dezactivat'}.`)
      } else {
        alert('Eroare la actualizarea setărilor: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Eroare la actualizarea setărilor')
    }
  }

  const handleAddChild = async (e) => {
    e.preventDefault()

    if (!selectedFamilyId) {
      alert('Vă rugăm să selectați o familie')
      return
    }

    if (!newChild.name.trim()) {
      alert('Numele copilului este obligatoriu')
      return
    }

    try {
      setUploading(true)

      const response = await adminFetch('/api/children/create', {
        method: 'POST',
        body: JSON.stringify({
          familyId: selectedFamilyId,
          name: newChild.name,
          birthDate: newChild.birthDate || null,
          profilePictureUrl: newChild.profilePictureUrl || null,
          displayOrder: children.length
        })
      })

      const result = await response.json()

      if (response.ok) {
        setChildren([...children, result.child])
        setNewChild({ name: '', birthDate: '', profilePictureUrl: '' })
        setShowAddChild(false)
        // Refresh title after adding child
        fetchFamilyData(selectedFamilyId)
        alert('Copilul a fost adăugat cu succes!')
      } else {
        alert('Eroare la adăugarea copilului: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding child:', error)
      alert('Eroare la adăugarea copilului')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveChild = async (childId, childName) => {
    if (!confirm(`Sigur doriți să eliminați copilul "${childName}"? Această acțiune nu poate fi anulată.`)) {
      return
    }

    try {
      const response = await adminFetch('/api/children/delete', {
        method: 'DELETE',
        body: JSON.stringify({ childId })
      })

      const result = await response.json()

      if (response.ok) {
        // Remove child from local state
        setChildren(children.filter(child => child.id !== childId))
        // Refresh title after removing child
        fetchFamilyData(selectedFamilyId)
        alert(`Copilul "${childName}" a fost eliminat cu succes!`)
      } else {
        alert('Eroare la eliminarea copilului: ' + result.error)
      }
    } catch (error) {
      console.error('Error removing child:', error)
      alert('Eroare la eliminarea copilului')
    }
  }

  // PIN generation now happens server-side in /api/admin/families/create
  // (see comments there). The previous client-side generateUniquePin
  // function read directly from the families table, which RLS blocks under
  // strict policies — and it leaked all existing PINs to the browser anyway.

  const handleProfilePictureChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith('image/')) {
      setSetupError('Vă rugăm să selectați doar fișiere imagine')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setSetupError('Mărimea imaginii trebuie să fie mai mică de 10MB')
      return
    }

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 500,
        useWebWorker: true
      }

      const compressedFile = await imageCompression(selectedFile, options)
      setProfilePicture(compressedFile)

      const previewUrl = URL.createObjectURL(compressedFile)
      setProfilePreview(previewUrl)
      setSetupError('')
    } catch (error) {
      console.error('Error compressing profile picture:', error)
      setSetupError('Eroare la procesarea imaginii de profil')
    }
  }

  const uploadProfilePicture = async (familyId) => {
    if (!profilePicture) return null

    const fileExt = profilePicture.name.split('.').pop()
    const fileName = `${familyId}/profile.${fileExt}`

    const { error } = await supabase.storage
      .from('photos')
      .upload(fileName, profilePicture, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleFamilySetup = async (e) => {
    e.preventDefault()

    if (!familyName.trim()) {
      setSetupError('Vă rugăm să introduceți numele familiei')
      return
    }

    if (!parentName.trim()) {
      setSetupError('Vă rugăm să introduceți numele părintelui')
      return
    }

    if (!childName.trim()) {
      setSetupError('Vă rugăm să introduceți numele copilului')
      return
    }

    if (!phoneNumber.trim()) {
      setSetupError('Vă rugăm să introduceți numărul de telefon')
      return
    }

    // Validate phone number format (Romanian format)
    const phoneRegex = /^(0)?[67][0-9]{7}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setSetupError('Numărul de telefon nu este valid (format: 061234567 sau 61234567)')
      return
    }

    // Optional email — validated server-side, but check format here too
    // so the user gets immediate feedback.
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(cleanEmail)) {
        setSetupError('Adresa de email nu este validă')
        return
      }
    }

    setSetupLoading(true)
    setSetupError('')
    setSetupSuccess(null)

    try {
      // Create the family via the admin API. The server generates the PINs
      // and inserts with service_role — direct browser inserts are blocked
      // by RLS (see /api/admin/families/create.js for the full rationale).
      const createResponse = await adminFetch('/api/admin/families/create', {
        method: 'POST',
        body: JSON.stringify({
          name: familyName.trim(),
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          email: cleanEmail || undefined,
          package: tier,
        })
      })
      const parsed = await parseAdminResponse(createResponse)
      if (!parsed.ok) {
        // parsed.error is already user-readable (HTML 404, schema mismatch,
        // duplicate phone, etc.). No more cryptic "Unexpected token '<'".
        throw new Error(parsed.error || 'Crearea familiei a eșuat')
      }
      const data = parsed.data.family
      const viewerPin = data.viewer_pin
      const editorPin = data.editor_pin

      let profilePictureUrl = null
      if (profilePicture) {
        try {
          profilePictureUrl = await uploadProfilePicture(data.id)

          // Persist the URL via the admin update endpoint (RLS-safe).
          const updateResponse = await adminFetch('/api/admin/families/update', {
            method: 'POST',
            body: JSON.stringify({ id: data.id, profilePictureUrl })
          })
          const updateParsed = await parseAdminResponse(updateResponse)
          if (!updateParsed.ok) {
            console.error('Profile picture URL save failed:', updateParsed.error)
            setSetupError(`Eroare la salvarea pozei de profil: ${updateParsed.error}`)
          } else {
            // Create a post in the album for the family profile picture
            try {
              const postResponse = await adminFetch('/api/posts/create', {
                method: 'POST',
                body: JSON.stringify({
                  familyId: data.id,
                  type: 'image',
                  title: `Poza de profil - ${familyName.trim()}`,
                  description: `Prima poză de profil a familiei ${familyName.trim()}`,
                  fileUrl: profilePictureUrl,
                  category: 'family',
                  hashtags: '#familia #profil'
                })
              })

              const postResult = await postResponse.json()

              if (!postResponse.ok) {
                console.warn('Failed to create album post for profile picture:', postResult.error)
              }
            } catch (postError) {
              console.warn('Error creating album post for profile picture:', postError)
              // Don't fail the family creation for this
            }
          }
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError)
          setSetupError(`Încărcarea pozei a eșuat: ${uploadError.message}`)
          // Continue without profile picture
        }
      }

      // Create the first child
      try {
        const childResponse = await adminFetch('/api/children/create', {
          method: 'POST',
          body: JSON.stringify({
            familyId: data.id,
            name: childName.trim(),
            birthDate: null,
            profilePictureUrl: null,
            displayOrder: 0
          })
        })

        const childResult = await childResponse.json()

        if (!childResponse.ok) {
          console.warn('Failed to create first child:', childResult.error)
        }
      } catch (childError) {
        console.warn('Error creating first child:', childError)
      }

      setSetupSuccess({
        familyId: data.id,
        familyName: data.name,
        phoneNumber: data.phone_number,
        email: data.email,
        parentName: parentName.trim(),
        childName: childName.trim(),
        viewerPin,
        editorPin,
        profilePictureUrl
      })
      setFamilyName('')
      setParentName('')
      setChildName('')
      setPhoneNumber('')
      setEmail('')
      setTier('starter')
      setProfilePicture(null)
      setProfilePreview('')

      // Refresh families list and select the new family
      fetchAllFamilies()
      setSelectedFamilyId(data.id)

    } catch (error) {
      console.error('Setup error:', error)
      setSetupError(`Crearea familiei a eșuat: ${error.message}`)
    } finally {
      setSetupLoading(false)
    }
  }

  const handleCreateAnother = () => {
    setSetupSuccess(null)
    setSetupError('')
    setFamilyName('')
    setParentName('')
    setChildName('')
    setPhoneNumber('')
    setEmail('')
    setTier('starter')
    setProfilePicture(null)
    setProfilePreview('')
    setShowFamilySetup(false)
  }

  const handleLogout = () => {
    clearAdminSession()
    router.push('/admin/login')
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

  // Remove session dependency since we're not using album authentication

  return (
    <div data-theme="dark" style={{ minHeight: '100vh' }}>
      <div className="main-container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="glass" style={{ padding: '22px 26px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h1 className="text-page-title" style={{ marginBottom: '2px' }}>
                  Administrare Album
                </h1>
                <p className="text-subtle" style={{ margin: 0 }}>
                  Gestionează albumele de familie, setările pentru mai mulți copii și profilurile copiilor.
                </p>
              </div>
            </div>
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

        {/* Family Selection */}
        <div className="card-glass" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 className="text-section-title" style={{ marginBottom: '14px' }}>
            Selectează Familie
          </h2>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            className="input-glass"
            style={{ maxWidth: '460px' }}
          >
            <option value="">Selectează o familie...</option>
            {allFamilies.map((family) => (
              <option key={family.id} value={family.id}>
                {family.displayTitle} - {family.phoneDisplay}
              </option>
            ))}
          </select>
          {allFamilies.length === 0 && (
            <p className="text-subtle" style={{ marginTop: '10px' }}>
              Nu există familii create încă. Creează prima familie mai jos.
            </p>
          )}
        </div>

        {/* Family Setup Section */}
        <div className="card-glass" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <h2 className="text-section-title" style={{ margin: 0 }}>
              Creare Album Familie
            </h2>
            <button
              onClick={() => setShowFamilySetup(!showFamilySetup)}
              className="btn-iris sheen"
            >
              {showFamilySetup ? 'Ascunde' : '+ Creează Album Nou'}
            </button>
          </div>

          {showFamilySetup && !setupSuccess && (
            <form onSubmit={handleFamilySetup} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Numele Familiei *
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input-glass"
                  placeholder="Introduceți numele familiei (de ex., 'Familia Popescu')"
                  required
                />
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Numele Părintelui *
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="input-glass"
                  placeholder="Introduceți numele părintelui (de ex., 'Maria Popescu')"
                  required
                />
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Numele Copilului *
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="input-glass"
                  placeholder="Introduceți numele copilului (de ex., 'Andrei')"
                  required
                />
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Numărul de Telefon *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-glass"
                  placeholder="Introduceți numărul de telefon (ex: 061234567)"
                  required
                />
                <div className="text-tertiary" style={{ marginTop: '6px' }}>
                  Format acceptat: 061234567 sau 61234567
                </div>
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Email (Opțional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass"
                  placeholder="parinte@email.com"
                />
                <div className="text-tertiary" style={{ marginTop: '6px' }}>
                  Folosit pentru resetare PIN și autentificare 2FA via email.
                </div>
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Plan
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="input-glass"
                >
                  {TIER_ORDER.map((key) => (
                    <option key={key} value={key}>{TIERS[key].label}</option>
                  ))}
                </select>
                <div className="text-tertiary" style={{ marginTop: '6px' }}>
                  {TIERS[tier]?.blurb}
                </div>
              </div>

              <div>
                <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Poza de Profil (Opțional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="input-glass"
                  style={{ paddingTop: '10px', paddingBottom: '10px' }}
                />

                {profilePreview && (
                  <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={profilePreview}
                        alt="Preview profil"
                        style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--glass-hairline-strong)',
                          boxShadow: '0 8px 22px -6px rgba(0,0,0,0.40)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePicture(null)
                          setProfilePreview('')
                        }}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '26px',
                          height: '26px',
                          background: 'linear-gradient(135deg, #f87171, #dc2626)',
                          color: 'white',
                          borderRadius: '50%',
                          border: '2px solid var(--glass-hairline-strong)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 6px 16px -4px rgba(220,38,38,0.55)'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {setupError && (
                <div className="glass-soft" style={{
                  padding: '14px 16px',
                  borderColor: 'rgba(239,68,68,0.40)',
                  background: 'rgba(239,68,68,0.10)',
                  color: 'var(--accent-red)'
                }}>
                  {setupError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowFamilySetup(false)}
                  className="btn-glass"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="btn-iris sheen"
                >
                  {setupLoading ? 'Creez Albumul...' : 'Creează Album'}
                </button>
              </div>
            </form>
          )}

          {setupSuccess && (
            <div className="glass-soft" style={{
              marginTop: '20px',
              padding: '24px',
              borderColor: 'rgba(52,211,153,0.40)',
              background: 'rgba(52,211,153,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #34d399, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px -6px rgba(16,185,129,0.55)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="text-section-title" style={{ margin: 0 }}>
                  Albumul a fost creat cu succes!
                </h3>
              </div>

              {setupSuccess.profilePictureUrl && (
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <img
                    src={setupSuccess.profilePictureUrl}
                    alt="Profil familie"
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-mint)',
                      boxShadow: '0 8px 20px -6px rgba(16,185,129,0.45)'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '4px' }}>Familie</div>
                  <div className="text-body" style={{ fontWeight: 600 }}>{setupSuccess.familyName}</div>
                </div>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '4px' }}>Părinte</div>
                  <div className="text-body" style={{ fontWeight: 600 }}>{setupSuccess.parentName}</div>
                </div>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '4px' }}>Copil</div>
                  <div className="text-body" style={{ fontWeight: 600 }}>{setupSuccess.childName}</div>
                </div>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '4px' }}>Telefon</div>
                  <div className="text-body nums" style={{ fontWeight: 600 }}>{setupSuccess.phoneNumber}</div>
                </div>
                {setupSuccess.email && (
                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '4px' }}>Email</div>
                    <div className="text-body" style={{ fontWeight: 600, wordBreak: 'break-all' }}>{setupSuccess.email}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '6px' }}>PIN Vizualizator</div>
                  <div className="glass-soft nums" style={{
                    padding: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textAlign: 'center'
                  }}>
                    {setupSuccess.viewerPin}
                  </div>
                </div>
                <div>
                  <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '6px' }}>PIN Editor</div>
                  <div className="glass-soft nums" style={{
                    padding: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textAlign: 'center'
                  }}>
                    {setupSuccess.editorPin}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateAnother}
                className="btn-iris sheen"
              >
                Creează Alt Album
              </button>
            </div>
          )}
        </div>

        {/* Multi-Child Toggle - Only show when family is selected */}
        {selectedFamilyId && (
          <div className="card-glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 className="text-section-title" style={{ marginBottom: '16px' }}>
              Setări Album <span className="text-subtle" style={{ fontWeight: 500 }}>— {allFamilies.find(f => f.id === selectedFamilyId)?.name}</span>
            </h2>

          <div className="glass-soft" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px',
            marginBottom: '16px',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div>
              <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '4px' }}>
                Album cu mai mulți copii
              </h3>
              <p className="text-subtle">
                Activează funcționalitatea pentru mai mulți copii în acest album
              </p>
            </div>
            <button
              onClick={toggleMultiChild}
              style={{
                padding: '9px 18px',
                borderRadius: '999px',
                border: albumSettings?.is_multi_child ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--glass-hairline)',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: 600,
                background: albumSettings?.is_multi_child
                  ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  : 'var(--glass-2)',
                color: albumSettings?.is_multi_child ? 'white' : 'var(--ink-2)',
                boxShadow: albumSettings?.is_multi_child
                  ? 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 20px -6px rgba(124,58,237,0.55)'
                  : 'inset 0 1px 0 0 var(--glass-hairline-strong)',
                transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)'
              }}
            >
              {albumSettings?.is_multi_child ? 'Activat' : 'Dezactivat'}
            </button>
          </div>

          {/* Album Title Display */}
          <div className="glass-soft" style={{ padding: '18px' }}>
            <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '10px' }}>
              Titlul Albumului
            </h3>
            <div className="glass-soft" style={{ padding: '12px 14px' }}>
              <strong className="text-eyebrow" style={{ marginRight: '8px' }}>Titlu actual:</strong>
              <span style={{ color: 'var(--accent-iris)', fontWeight: 600 }}>{currentTitle}</span>
            </div>
            <div className="glass-soft" style={{
              padding: '14px 16px',
              marginTop: '12px',
              borderColor: 'rgba(6,182,212,0.40)',
              background: 'rgba(6,182,212,0.08)'
            }}>
              <h4 className="text-eyebrow" style={{ marginBottom: '8px', color: 'var(--accent-aqua)' }}>
                ℹ️ Logica titlului
              </h4>
              <ul className="text-subtle" style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.7 }}>
                <li>Un copil → "Albumul lui [numele copilului]"</li>
                <li>Zero sau mai mulți copii → "Albumul familiei [numele familiei]"</li>
                <li>Când se adaugă al doilea copil, titlul se schimbă automat la familia</li>
              </ul>
            </div>
          </div>
          </div>
        )}

        {/* Children Management - Only show if multi-child is enabled */}
        {albumSettings?.is_multi_child && (
          <div className="card-glass" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <h2 className="text-section-title" style={{ margin: 0 }}>
                Copii <span className="text-subtle nums" style={{ fontWeight: 500 }}>({children.length})</span>
              </h2>
              <button
                onClick={() => setShowAddChild(true)}
                className="btn-iris sheen"
              >
                + Adaugă Copil
              </button>
            </div>

            {/* Children List */}
            {children.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px'
              }}>
                <p className="text-body" style={{ color: 'var(--ink-2)' }}>Nu sunt copii adăugați încă.</p>
                <p className="text-subtle" style={{ marginTop: '8px' }}>
                  Adaugă primul copil pentru a începe să folosești funcționalitatea multi-copil.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '18px'
              }}>
                {children.map((child) => (
                  <div key={child.id} className="glass-soft" style={{
                    padding: '22px',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)'
                  }}>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveChild(child.id, child.name)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'linear-gradient(135deg, #f87171, #dc2626)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), filter 180ms cubic-bezier(0.22,1,0.36,1)',
                        boxShadow: '0 6px 16px -4px rgba(220,38,38,0.55)'
                      }}
                      title={`Elimină copilul ${child.name}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>

                    <div style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: 'white',
                      backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '2px solid var(--glass-hairline-strong)',
                      boxShadow: '0 10px 24px -6px rgba(124,58,237,0.45)'
                    }}>
                      {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '6px' }}>
                      {child.name}
                    </h3>
                    {child.birth_date && (
                      <p className="text-subtle nums">
                        {new Date(child.birth_date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'ro-RO')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Child Modal */}
        {showAddChild && (
          <div className="modal-scrim">
            <div className="modal-glass" style={{ maxWidth: '520px', width: '100%' }}>
              <div style={{ padding: '28px' }}>
                <button
                  onClick={() => {
                    setShowAddChild(false)
                    setNewChild({ name: '', birthDate: '', profilePictureUrl: '' })
                  }}
                  className="btn-icon"
                  style={{ position: 'absolute', top: 14, right: 14 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <h2 className="text-section-title" style={{ marginBottom: '22px' }}>
                  Adaugă Copil Nou
                </h2>

                <form onSubmit={handleAddChild} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                      Nume *
                    </label>
                    <input
                      type="text"
                      value={newChild.name}
                      onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                      className="input-glass"
                      placeholder="Numele copilului"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                      Data nașterii
                    </label>
                    <input
                      type="date"
                      value={newChild.birthDate}
                      onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
                      className="input-glass"
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                      URL poză profil
                    </label>
                    <input
                      type="url"
                      value={newChild.profilePictureUrl}
                      onChange={(e) => setNewChild({ ...newChild, profilePictureUrl: e.target.value })}
                      className="input-glass"
                      placeholder="https://..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddChild(false)
                        setNewChild({ name: '', birthDate: '', profilePictureUrl: '' })
                      }}
                      className="btn-glass"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="btn-iris sheen"
                    >
                      {uploading ? 'Se adaugă...' : 'Adaugă Copil'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
