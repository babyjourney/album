import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { useLanguage } from '../../contexts/LanguageContext'
import { isAdminAuthenticated, clearAdminSession } from '../../lib/adminAuth'

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
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState(null)
  
  // Album title configuration states
  const [showTitleConfig, setShowTitleConfig] = useState(false)
  const [configFamilyName, setConfigFamilyName] = useState('')
  const [configChildName, setConfigChildName] = useState('')
  const [titleConfigLoading, setTitleConfigLoading] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('Family Album')
  
  // Family management states
  const [allFamilies, setAllFamilies] = useState([])
  const [selectedFamilyId, setSelectedFamilyId] = useState('')
  

  useEffect(() => {
    checkAuth()
    fetchAllFamilies()
  }, [])

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

  const fetchAllFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, name')
        .order('name')

      if (error) throw error
      setAllFamilies(data || [])
    } catch (error) {
      console.error('Error fetching families:', error)
    }
  }

  const fetchFamilyData = async (familyId) => {
    try {
      // Fetch album settings
      const settingsResponse = await fetch(`/api/album-settings/get?familyId=${familyId}`)
      const settingsResult = await settingsResponse.json()
      
      if (settingsResponse.ok) {
        setAlbumSettings(settingsResult.settings)
        setConfigFamilyName(settingsResult.settings?.family_name || '')
        setConfigChildName(settingsResult.settings?.primary_child_name || '')
      }

      // Fetch children
      const childrenResponse = await fetch(`/api/children/list?familyId=${familyId}`)
      const childrenResult = await childrenResponse.json()
      
      if (childrenResponse.ok) {
        setChildren(childrenResult.children)
      }

      // Fetch current album title
      const titleResponse = await fetch(`/api/album-settings/get-title?familyId=${familyId}`)
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
      const response = await fetch('/api/album-settings/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      const response = await fetch('/api/children/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch('/api/children/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Family setup functions
  const generateUniquePin = async (length) => {
    const column = length === 4 ? 'viewer_pin' : 'editor_pin'
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const pin = Math.floor(Math.random() * Math.pow(10, length))
        .toString()
        .padStart(length, '0')
      
      const { error } = await supabase
        .from('families')
        .select('id')
        .eq(column, pin)
        .single()

      if (error && error.code === 'PGRST116') {
        return pin
      }
      
      attempts++
    }
    
    throw new Error(`Nu s-a putut genera un PIN unic de ${length} cifre după ${maxAttempts} încercări`)
  }

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
      .from('album_uploads')
      .upload(fileName, profilePicture, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('album_uploads')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleFamilySetup = async (e) => {
    e.preventDefault()
    
    if (!familyName.trim()) {
      setSetupError('Vă rugăm să introduceți numele familiei')
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

    setSetupLoading(true)
    setSetupError('')
    setSetupSuccess(null)

    try {
      const viewerPin = await generateUniquePin(4)
      const editorPin = await generateUniquePin(8)

      const { data, error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          phone_number: phoneNumber.replace(/\s/g, ''),
          viewer_pin: viewerPin,
          editor_pin: editorPin
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      let profilePictureUrl = null
      if (profilePicture) {
        try {
          console.log('Uploading profile picture for family:', data.id)
          profilePictureUrl = await uploadProfilePicture(data.id)
          console.log('Profile picture uploaded successfully:', profilePictureUrl)
          
          const { data: updateData, error: updateError } = await supabase
            .from('families')
            .update({ profile_picture_url: profilePictureUrl })
            .eq('id', data.id)
            .select()

          if (updateError) {
            console.error('Error updating profile picture URL:', updateError)
            setSetupError(`Eroare la salvarea pozei de profil: ${updateError.message}`)
          } else {
            console.log('Profile picture URL saved successfully:', updateData)
            
            // Create a post in the album for the family profile picture
            try {
              const postResponse = await fetch('/api/posts/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
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
              } else {
                console.log('Profile picture post created successfully:', postResult.post.id)
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

      setSetupSuccess({
        familyId: data.id,
        familyName: data.name,
        phoneNumber: data.phone_number,
        viewerPin,
        editorPin,
        profilePictureUrl
      })
      setFamilyName('')
      setPhoneNumber('')
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
    setPhoneNumber('')
    setProfilePicture(null)
    setProfilePreview('')
    setShowFamilySetup(false)
  }

  const handleLogout = () => {
    clearAdminSession()
    router.push('/admin/login')
  }

  // Album title configuration functions
  const handleTitleConfigSave = async () => {
    if (!selectedFamilyId) {
      alert('Vă rugăm să selectați o familie')
      return
    }

    setTitleConfigLoading(true)
    try {
      const response = await fetch('/api/album-settings/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId: selectedFamilyId,
          isMultiChild: albumSettings?.is_multi_child || false,
          familyName: configFamilyName.trim() || null,
          primaryChildName: configChildName.trim() || null
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setAlbumSettings(result.settings)
        // Refresh title
        fetchFamilyData(selectedFamilyId)
        setShowTitleConfig(false)
        alert('Setările numelui albumului au fost actualizate cu succes!')
      } else {
        alert('Eroare la actualizarea setărilor: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating title settings:', error)
      alert('Eroare la actualizarea setărilor numelui albumului')
    } finally {
      setTitleConfigLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Remove session dependency since we're not using album authentication

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-gray)' }}>      
      <div className="main-container" style={{ paddingTop: '40px' }}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="text-page-title" style={{ marginBottom: '8px' }}>
                Administrare Album
              </h1>
              <p className="text-subtle">
                Gestionează albumele de familie, setările pentru mai mulți copii și profilurile copiilor.
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#B91C1C'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#DC2626'
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
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="text-section-title" style={{ marginBottom: '16px' }}>
            Selectează Familie
          </h2>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            className="input-field"
            style={{ maxWidth: '400px' }}
          >
            <option value="">Selectează o familie...</option>
            {allFamilies.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
          {allFamilies.length === 0 && (
            <p className="text-subtle" style={{ marginTop: '8px', fontSize: '14px' }}>
              Nu există familii create încă. Creează prima familie mai jos.
            </p>
          )}
        </div>

        {/* Family Setup Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 className="text-section-title">
              Creare Album Familie
            </h2>
            <button
              onClick={() => setShowFamilySetup(!showFamilySetup)}
              className="btn-primary"
            >
              {showFamilySetup ? 'Ascunde' : '+ Creează Album Nou'}
            </button>
          </div>

          {showFamilySetup && !setupSuccess && (
            <form onSubmit={handleFamilySetup} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                  Numele Familiei *
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input-field"
                  placeholder="Introduceți numele familiei (de ex., 'Familia Popescu')"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                  Numărul de Telefon *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-field"
                  placeholder="Introduceți numărul de telefon (ex: 061234567)"
                  required
                />
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Format acceptat: 061234567 sau 61234567
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                  Poza de Profil (Opțional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="input-field"
                  style={{ paddingTop: '8px', paddingBottom: '8px' }}
                />
                
                {profilePreview && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={profilePreview}
                        alt="Preview profil"
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border-light)'
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
                          top: '-5px',
                          right: '-5px',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#DC2626',
                          color: 'white',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {setupError && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '12px', 
                  backgroundColor: '#FEF2F2', 
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626'
                }}>
                  {setupError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowFamilySetup(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    backgroundColor: 'white',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="btn-primary"
                >
                  {setupLoading ? 'Creez Albumul...' : 'Creează Album'}
                </button>
              </div>
            </form>
          )}

          {setupSuccess && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#15803D', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                ✅ Albumul a fost creat cu succes!
              </h3>
              
              {setupSuccess.profilePictureUrl && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={setupSuccess.profilePictureUrl}
                    alt="Profil familie"
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #22C55E'
                    }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#15803D' }}>Familie:</strong> {setupSuccess.familyName}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#15803D' }}>Telefon:</strong> {setupSuccess.phoneNumber}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#15803D' }}>PIN Vizualizator:</strong>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  backgroundColor: 'white',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  marginLeft: '8px',
                  border: '1px solid #DCFCE7'
                }}>
                  {setupSuccess.viewerPin}
                </span>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#15803D' }}>PIN Editor:</strong>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  backgroundColor: 'white',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  marginLeft: '8px',
                  border: '1px solid #DCFCE7'
                }}>
                  {setupSuccess.editorPin}
                </span>
              </div>
              
              <button
                onClick={handleCreateAnother}
                className="btn-primary"
                style={{ fontSize: '14px' }}
              >
                Creează Alt Album
              </button>
            </div>
          )}
        </div>

        {/* Multi-Child Toggle - Only show when family is selected */}
        {selectedFamilyId && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="text-section-title" style={{ marginBottom: '16px' }}>
              Setări Album - {allFamilies.find(f => f.id === selectedFamilyId)?.name}
            </h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: 'var(--bg-gray)',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            marginBottom: '16px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                Album cu mai mulți copii
              </h3>
              <p className="text-subtle" style={{ fontSize: '14px' }}>
                Activează funcționalitatea pentru mai mulți copii în acest album
              </p>
            </div>
            <button
              onClick={toggleMultiChild}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: albumSettings?.is_multi_child ? 'var(--accent-blue)' : '#E5E7EB',
                color: albumSettings?.is_multi_child ? 'white' : '#6B7280',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {albumSettings?.is_multi_child ? 'Activat' : 'Dezactivat'}
            </button>
          </div>

          {/* Album Title Configuration */}
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-gray)',
            borderRadius: '12px',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  Titlul Albumului
                </h3>
                <p className="text-subtle" style={{ fontSize: '14px' }}>
                  Configurează numele familiei și copilului pentru titlul albumului
                </p>
              </div>
              <button
                onClick={() => setShowTitleConfig(!showTitleConfig)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'white',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {showTitleConfig ? 'Ascunde' : 'Configurează'}
              </button>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid var(--border-light)'
            }}>
              <strong>Titlu actual:</strong> <span style={{ color: 'var(--accent-blue)' }}>{currentTitle}</span>
            </div>

            {showTitleConfig && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                    Numele Familiei
                  </label>
                  <input
                    type="text"
                    value={configFamilyName}
                    onChange={(e) => setConfigFamilyName(e.target.value)}
                    className="input-field"
                    placeholder="ex: Popescu"
                    style={{ fontSize: '14px' }}
                  />
                  <p className="text-subtle" style={{ fontSize: '12px', marginTop: '4px' }}>
                    Pentru mai mulți copii: "Albumul familiei [numele]"
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                    Numele Copilului Principal
                  </label>
                  <input
                    type="text"
                    value={configChildName}
                    onChange={(e) => setConfigChildName(e.target.value)}
                    className="input-field"
                    placeholder="ex: Maria"
                    style={{ fontSize: '14px' }}
                  />
                  <p className="text-subtle" style={{ fontSize: '12px', marginTop: '4px' }}>
                    Pentru un singur copil: "Albumul [numele copilului]"
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '8px',
                  border: '1px solid #DBEAFE',
                  marginBottom: '16px'
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1E40AF' }}>
                    ℹ️ Logica titlului:
                  </h4>
                  <ul style={{ fontSize: '12px', color: '#374151', margin: 0, paddingLeft: '16px' }}>
                    <li>Un copil → "Albumul [numele copilului]"</li>
                    <li>Mai mulți copii → "Albumul familiei [numele familiei]"</li>
                    <li>Când se adaugă al doilea copil, titlul se schimbă automat la familia</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowTitleConfig(false)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Anulează
                  </button>
                  <button
                    onClick={handleTitleConfigSave}
                    disabled={titleConfigLoading}
                    className="btn-primary"
                    style={{ fontSize: '14px' }}
                  >
                    {titleConfigLoading ? 'Salvez...' : 'Salvează'}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Children Management - Only show if multi-child is enabled */}
        {albumSettings?.is_multi_child && (
          <div className="card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 className="text-section-title">
                Copii ({children.length})
              </h2>
              <button
                onClick={() => setShowAddChild(true)}
                className="btn-primary"
              >
                + Adaugă Copil
              </button>
            </div>

            {/* Children List */}
            {children.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-secondary)'
              }}>
                <p>Nu sunt copii adăugați încă.</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Adaugă primul copil pentru a începe să folosești funcționalitatea multi-copil.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {children.map((child) => (
                  <div key={child.id} style={{
                    padding: '20px',
                    backgroundColor: 'var(--bg-gray)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveChild(child.id, child.name)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#DC2626',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease-in-out',
                        opacity: 0.8
                      }}
                      onMouseOver={(e) => {
                        e.target.style.opacity = '1'
                        e.target.style.transform = 'scale(1.1)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.opacity = '0.8'
                        e.target.style.transform = 'scale(1)'
                      }}
                      title={`Elimină copilul ${child.name}`}
                    >
                      ✕
                    </button>

                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-blue)',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      color: 'white',
                      backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      {child.name}
                    </h3>
                    {child.birth_date && (
                      <p className="text-subtle" style={{ fontSize: '14px' }}>
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
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
              <div style={{ padding: '24px' }}>
                <h2 className="text-section-title" style={{ marginBottom: '20px' }}>
                  Adaugă Copil Nou
                </h2>
                
                <form onSubmit={handleAddChild}>
                  <div style={{ marginBottom: '20px' }}>
                    <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                      Nume *
                    </label>
                    <input
                      type="text"
                      value={newChild.name}
                      onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                      className="input-field"
                      placeholder="Numele copilului"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                      Data nașterii
                    </label>
                    <input
                      type="date"
                      value={newChild.birthDate}
                      onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
                      URL poză profil
                    </label>
                    <input
                      type="url"
                      value={newChild.profilePictureUrl}
                      onChange={(e) => setNewChild({ ...newChild, profilePictureUrl: e.target.value })}
                      className="input-field"
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
                      style={{
                        padding: '10px 20px',
                        border: '1px solid var(--border-light)',
                        borderRadius: '16px',
                        backgroundColor: 'white',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="btn-primary"
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