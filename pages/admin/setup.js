import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import imageCompression from 'browser-image-compression'

export default function AdminSetup() {
  const [familyName, setFamilyName] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const generateUniquePin = async (length) => {
    const column = length === 4 ? 'viewer_pin' : 'editor_pin'
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const pin = Math.floor(Math.random() * Math.pow(10, length))
        .toString()
        .padStart(length, '0')
      
      const { data, error } = await supabase
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
      const viewerPin = await generateUniquePin(4)
      const editorPin = await generateUniquePin(8)

      // First create the family record
      const { data, error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          viewer_pin: viewerPin,
          editor_pin: editorPin
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Upload profile picture if provided
      let profilePictureUrl = null
      if (profilePicture) {
        profilePictureUrl = await uploadProfilePicture(data.id)
        
        // Update the family record with the profile picture URL
        const { error: updateError } = await supabase
          .from('families')
          .update({ profile_picture_url: profilePictureUrl })
          .eq('id', data.id)

        if (updateError) {
          console.error('Error updating profile picture URL:', updateError)
          // Don't throw error here, just log it as the family was already created
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              🔧 Configurare Administrare
            </h1>
            <p className="text-gray-600">
              Creați un nou album de familie cu acces PIN
            </p>
          </div>

          {/* SECURITY NOTE BANNER */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="text-amber-600 mr-3">⚠️</div>
              <div className="text-sm">
                <strong className="text-amber-800">Notă de Securitate:</strong> Această pagină ar trebui securizată 
                în producție prin implementarea autentificării de administrator (de ex., verificarea dacă un utilizator 
                admin specific este conectat, lista albă de IP-uri sau token-uri de admin securizate).
              </div>
            </div>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Numele Familiei *
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input"
                  placeholder="Introduceți numele familiei (de ex., 'Familia Popescu')"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Acesta va fi afișat ca numele albumului familiei
                </p>
              </div>

              <div>
                <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700 mb-1">
                  Poza de Profil (Opțional)
                </label>
                <div className="space-y-3">
                  <input
                    id="profilePicture"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="input"
                  />
                  <p className="text-xs text-gray-500">
                    Selectează o imagine pentru profilul familiei. Mărimea maximă: 10MB
                  </p>
                  
                  {profilePreview && (
                    <div className="mt-3 flex justify-center">
                      <div className="relative">
                        <img
                          src={profilePreview}
                          alt="Preview profil"
                          className="w-32 h-32 rounded-full object-cover border-4 border-primary-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePicture(null)
                            setProfilePreview('')
                            document.getElementById('profilePicture').value = ''
                          }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creez Albumul Familiei...' : 'Creează Album Familie'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-green-900 mb-4">
                  ✅ Albumul Familiei a Fost Creat cu Succes!
                </h2>
                
                <div className="text-left space-y-4">
                  {success.profilePictureUrl && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={success.profilePictureUrl}
                        alt="Profil familie"
                        className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
                      />
                    </div>
                  )}
                  
                  <div>
                    <strong className="text-green-800">Numele Familiei:</strong>
                    <div className="font-mono bg-white p-2 rounded border mt-1">
                      {success.familyName}
                    </div>
                  </div>

                  <div>
                    <strong className="text-green-800">PIN Vizualizator (Acces Doar Citire):</strong>
                    <div className="font-mono text-2xl bg-white p-3 rounded border mt-1 text-center">
                      {success.viewerPin}
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      PIN de 4 cifre pentru vizualizarea doar a fotografiilor și abilităților
                    </p>
                  </div>

                  <div>
                    <strong className="text-green-800">PIN Editor (Acces Complet):</strong>
                    <div className="font-mono text-2xl bg-white p-3 rounded border mt-1 text-center">
                      {success.editorPin}
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      PIN de 8 cifre pentru încărcare, editare și gestionarea conținutului
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Instrucțiuni pentru Client:</strong><br/>
                    Împărtășiți ambele PIN-uri cu clientul dumneavoastră. Aceștia pot folosi PIN-ul de 4 cifre doar pentru vizualizare, 
                    sau PIN-ul de 8 cifre pentru acces complet. Pagina de autentificare este la: <br/>
                    <span className="font-mono">{window.location.origin}/login</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateAnother}
                className="btn btn-primary"
              >
                Creează Alt Album de Familie
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Cum Funcționează</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs mr-3">4-digit</span>
                <span><strong>PIN Vizualizator:</strong> Acces doar pentru citire pentru a vedea fotografiile și progresul abilităților</span>
              </div>
              <div className="flex items-start">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs mr-3">8-digit</span>
                <span><strong>PIN Editor:</strong> Acces complet pentru a încărca fotografii, gestiona abilități și edita conținut</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}