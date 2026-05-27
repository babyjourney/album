import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { isAdminAuthenticated, clearAdminSession, adminFetch, parseAdminResponse } from '../../lib/adminAuth'

export default function AdminSetup() {
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    // Check if admin is authenticated
    if (!isAdminAuthenticated()) {
      router.push('/admin/login')
    }
  }, [router])

  // Admin routes are pinned to dark by ThemeProvider.

  // PIN generation moved server-side — see /api/admin/families/create.js.
  // The browser shouldn't query for PIN uniqueness (a) because RLS denies
  // the read under strict policy, and (b) because it would leak existing
  // PINs to anyone with admin access to the DOM.

  const handleProfilePictureChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Vă rugăm să selectați doar fișiere imagine')
      return
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Mărimea imaginii trebuie să fie mai mică de 10MB')
      return
    }

    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 500,
        useWebWorker: true
      }

      const compressedFile = await imageCompression(selectedFile, options)
      setProfilePicture(compressedFile)

      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile)
      setProfilePreview(previewUrl)
      setError('')
    } catch (error) {
      console.error('Error compressing profile picture:', error)
      setError('Eroare la procesarea imaginii de profil')
    }
  }

  const uploadProfilePicture = async (familyId) => {
    if (!profilePicture) return null

    const fileExt = profilePicture.name.split('.').pop()
    const fileName = `${familyId}/profile.${fileExt}`

    const { data, error } = await supabase.storage
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!familyName.trim()) {
      setError('Vă rugăm să introduceți numele familiei')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      // Create the family via the admin API (service_role / RLS-safe).
      const createResponse = await adminFetch('/api/admin/families/create', {
        method: 'POST',
        body: JSON.stringify({
          name: familyName.trim(),
        })
      })
      const parsed = await parseAdminResponse(createResponse)
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Crearea familiei a eșuat')
      }
      const data = parsed.data.family
      const viewerPin = data.viewer_pin
      const editorPin = data.editor_pin

      // Upload profile picture if provided
      let profilePictureUrl = null
      if (profilePicture) {
        profilePictureUrl = await uploadProfilePicture(data.id)

        // Update the family record with the profile picture URL via the
        // admin API (direct table updates are RLS-blocked from the browser).
        const updateResponse = await adminFetch('/api/admin/families/update', {
          method: 'POST',
          body: JSON.stringify({ id: data.id, profilePictureUrl })
        })
        const updateParsed = await parseAdminResponse(updateResponse)
        const updateError = updateParsed.ok ? null : { error: updateParsed.error }

        if (updateError) {
          console.error('Error updating profile picture URL:', updateError)
          // Don't throw error here, just log it as the family was already created
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
            } else {
              console.log('Profile picture post created successfully:', postResult.post.id)
            }
          } catch (postError) {
            console.warn('Error creating album post for profile picture:', postError)
            // Don't fail the family creation for this
          }
        }
      }

      setSuccess({
        familyId: data.id,
        familyName: data.name,
        viewerPin,
        editorPin,
        profilePictureUrl
      })
      setFamilyName('')
      setProfilePicture(null)
      setProfilePreview('')

    } catch (error) {
      console.error('Setup error:', error)
      setError(`Crearea familiei a eșuat: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnother = () => {
    setSuccess(null)
    setError('')
    setProfilePicture(null)
    setProfilePreview('')
  }

  return (
    <div data-theme="dark" style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="card-glass" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), 0 12px 32px -8px rgba(124,58,237,0.55)'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <h1 className="text-page-title" style={{ marginBottom: '6px' }}>
              🔧 Configurare Administrare
            </h1>
            <p className="text-subtle">
              Creați un nou album de familie cu acces PIN
            </p>
          </div>

          {/* SECURITY NOTE BANNER */}
          <div className="glass-soft" style={{
            padding: '16px 18px',
            marginBottom: '24px',
            borderColor: 'rgba(245,158,11,0.40)',
            background: 'rgba(245,158,11,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: 'var(--accent-amber)', fontSize: '18px', lineHeight: 1 }}>⚠️</div>
              <div className="text-subtle" style={{ color: 'var(--ink-1)' }}>
                <strong style={{ color: 'var(--accent-amber)' }}>Notă de Securitate:</strong> Această pagină ar trebui securizată
                în producție prin implementarea autentificării de administrator (de ex., verificarea dacă un utilizator
                admin specific este conectat, lista albă de IP-uri sau token-uri de admin securizate).
              </div>
            </div>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <label htmlFor="familyName" className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Numele Familiei *
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input-glass"
                  placeholder="Introduceți numele familiei (de ex., 'Familia Popescu')"
                  required
                />
                <p className="text-tertiary" style={{ marginTop: '6px' }}>
                  Acesta va fi afișat ca numele albumului familiei
                </p>
              </div>

              <div>
                <label htmlFor="profilePicture" className="text-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
                  Poza de Profil (Opțional)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    id="profilePicture"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="input-glass"
                    style={{ paddingTop: '10px', paddingBottom: '10px' }}
                  />
                  <p className="text-tertiary">
                    Selectează o imagine pentru profilul familiei. Mărimea maximă: 10MB
                  </p>

                  {profilePreview && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={profilePreview}
                          alt="Preview profil"
                          style={{
                            width: '128px',
                            height: '128px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid var(--glass-hairline-strong)',
                            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.40)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePicture(null)
                            setProfilePreview('')
                            document.getElementById('profilePicture').value = ''
                          }}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #f87171, #dc2626)',
                            color: 'white',
                            borderRadius: '50%',
                            border: '2px solid var(--glass-hairline-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px -4px rgba(220,38,38,0.55)'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="glass-soft" style={{
                  padding: '14px 16px',
                  borderColor: 'rgba(239,68,68,0.40)',
                  background: 'rgba(239,68,68,0.10)',
                  color: 'var(--accent-red)',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-iris sheen"
                style={{ width: '100%', padding: '14px 22px', fontSize: '15px' }}
              >
                {loading ? 'Creez Albumul Familiei...' : 'Creează Album Familie'}
              </button>
            </form>
          ) : (
            <div>
              <div className="glass-soft" style={{
                padding: '24px',
                marginBottom: '20px',
                borderColor: 'rgba(52,211,153,0.40)',
                background: 'rgba(52,211,153,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #34d399, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px -6px rgba(16,185,129,0.55)'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h2 className="text-section-title" style={{ margin: 0 }}>
                    Albumul Familiei a Fost Creat cu Succes!
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {success.profilePictureUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                      <img
                        src={success.profilePictureUrl}
                        alt="Profil familie"
                        style={{
                          width: '96px',
                          height: '96px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid var(--accent-mint)',
                          boxShadow: '0 12px 28px -8px rgba(16,185,129,0.45)'
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '6px' }}>Numele Familiei</div>
                    <div className="glass-soft" style={{
                      padding: '12px 14px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '15px',
                      color: 'var(--ink-1)'
                    }}>
                      {success.familyName}
                    </div>
                  </div>

                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '6px' }}>PIN Vizualizator (Acces Doar Citire)</div>
                    <div className="glass-soft nums" style={{
                      padding: '16px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '28px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textAlign: 'center',
                      color: 'var(--ink-1)'
                    }}>
                      {success.viewerPin}
                    </div>
                    <p className="text-tertiary" style={{ marginTop: '6px', color: 'var(--accent-mint)' }}>
                      PIN de 4 cifre pentru vizualizarea doar a fotografiilor și abilităților
                    </p>
                  </div>

                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--accent-mint)', marginBottom: '6px' }}>PIN Editor (Acces Complet)</div>
                    <div className="glass-soft nums" style={{
                      padding: '16px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '28px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textAlign: 'center',
                      color: 'var(--ink-1)'
                    }}>
                      {success.editorPin}
                    </div>
                    <p className="text-tertiary" style={{ marginTop: '6px', color: 'var(--accent-mint)' }}>
                      PIN de 8 cifre pentru încărcare, editare și gestionarea conținutului
                    </p>
                  </div>
                </div>

                <div className="glass-soft" style={{
                  marginTop: '22px',
                  padding: '16px 18px',
                  borderColor: 'rgba(6,182,212,0.40)',
                  background: 'rgba(6,182,212,0.08)'
                }}>
                  <p className="text-subtle" style={{ color: 'var(--ink-1)' }}>
                    <strong style={{ color: 'var(--accent-aqua)' }}>Instrucțiuni pentru Client:</strong><br/>
                    Împărtășiți ambele PIN-uri cu clientul dumneavoastră. Aceștia pot folosi PIN-ul de 4 cifre doar pentru vizualizare,
                    sau PIN-ul de 8 cifre pentru acces complet. Pagina de autentificare este la: <br/>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-iris)' }}>{window.location.origin}/login</span>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleCreateAnother}
                  className="btn-iris sheen"
                >
                  Creează Alt Album de Familie
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--glass-hairline)' }}>
            <h3 className="text-section-title" style={{ marginBottom: '14px', fontSize: '17px' }}>Cum Funcționează</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span className="glass-pill nums" style={{
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--accent-aqua)',
                  borderColor: 'rgba(6,182,212,0.40)',
                  background: 'rgba(6,182,212,0.10)',
                  flexShrink: 0
                }}>4-digit</span>
                <span className="text-subtle"><strong style={{ color: 'var(--ink-1)' }}>PIN Vizualizator:</strong> Acces doar pentru citire pentru a vedea fotografiile și progresul abilităților</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span className="glass-pill nums" style={{
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--accent-iris)',
                  borderColor: 'rgba(124,58,237,0.40)',
                  background: 'rgba(124,58,237,0.12)',
                  flexShrink: 0
                }}>8-digit</span>
                <span className="text-subtle"><strong style={{ color: 'var(--ink-1)' }}>PIN Editor:</strong> Acces complet pentru a încărca fotografii, gestiona abilități și edita conținut</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
