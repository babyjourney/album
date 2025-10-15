import { useState, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'

export default function UploadForm({ familyId, onUploadSuccess, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('memories')
  const [file, setFile] = useState(null)
  const [files, setFiles] = useState([])
  const [isMultiPhoto, setIsMultiPhoto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hashtags, setHashtags] = useState([])
  const [currentHashtagInput, setCurrentHashtagInput] = useState('')
  const [compressionInfo, setCompressionInfo] = useState(null)
  const [selectedChildren, setSelectedChildren] = useState([])
  const [children, setChildren] = useState([])
  const [albumSettings, setAlbumSettings] = useState(null)
  const [customDate, setCustomDate] = useState(null)
  const [categories, setCategories] = useState([])
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const modalRef = useRef(null)

  // Handle click outside to close modal
  useOnClickOutside(modalRef, onClose)

  // Load categories on mount
  useEffect(() => {
    setCategories(getCategories())
  }, [])

  // Handle hashtag input
  const handleHashtagKeyDown = (e) => {
    if (e.key === ' ' && currentHashtagInput.trim()) {
      e.preventDefault()
      const newTag = currentHashtagInput.trim().toLowerCase()
      if (!hashtags.includes(newTag)) {
        setHashtags([...hashtags, newTag])
      }
      setCurrentHashtagInput('')
    } else if (e.key === 'Backspace' && !currentHashtagInput && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1))
    }
  }


  // Fetch children and album settings when component mounts
  useEffect(() => {
    const fetchChildrenData = async () => {
      try {
        // Fetch album settings
        const settingsResponse = await fetch(`/api/album-settings/get?familyId=${familyId}`)
        const settingsResult = await settingsResponse.json()
        
        if (settingsResponse.ok) {
          setAlbumSettings(settingsResult.settings)
          
          // If multi-child is enabled, fetch children
          if (settingsResult.settings?.is_multi_child) {
            const childrenResponse = await fetch(`/api/children/list?familyId=${familyId}`)
            const childrenResult = await childrenResponse.json()
            
            if (childrenResponse.ok) {
              setChildren(childrenResult.children)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching children data:', error)
      }
    }

    if (familyId) {
      fetchChildrenData()
    }
  }, [familyId])

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return

    setError('')
    setCompressionInfo(null)

    if (isMultiPhoto) {
      // Check if adding these files would exceed the 10-file limit
      const totalFilesAfterAddition = files.length + selectedFiles.length
      if (totalFilesAfterAddition > 10) {
        const errorMessage = t('error')
        setError(errorMessage)
        showError(errorMessage)
        return
      }

      // Handle multiple files - add to existing files
      const processedFiles = [...files] // Start with existing files
      setLoading(true)

      for (const selectedFile of selectedFiles) {
        // Check if file already exists (by name and size)
        const fileExists = processedFiles.some(existingFile => 
          existingFile.name === selectedFile.name && existingFile.size === selectedFile.size
        )
        
        if (fileExists) {
          console.log(`File ${selectedFile.name} already selected, skipping`)
          continue
        }

        // Check if we've reached the 10-file limit
        if (processedFiles.length >= 10) {
          const warningMessage = `Maximum 10 imagini sunt permise per postare. Restul imaginilor nu vor fi adăugate.`
          showError(warningMessage)
          break
        }

        // Check file size limit
        if (selectedFile.size > 500 * 1024 * 1024) {
          const errorMessage = `Fișierul ${selectedFile.name} trebuie să fie mai mic de 500MB`
          setError(errorMessage)
          showError(errorMessage)
          continue
        }

        // Only allow images for multi-photo posts
        if (!selectedFile.type.startsWith('image/')) {
          const errorMessage = `Pentru postări multiple sunt permise doar imagini. ${selectedFile.name} nu este o imagine.`
          setError(errorMessage)
          showError(errorMessage)
          continue
        }

        try {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: selectedFile.type,
            initialQuality: 0.8,
            alwaysKeepResolution: false
          }
          
          const compressedFile = await imageCompression(selectedFile, options)
          processedFiles.push(compressedFile)
        } catch (error) {
          console.error('Compression failed for', selectedFile.name, error)
          processedFiles.push(selectedFile)
        }
      }

      setFiles(processedFiles)
      setFile(null)
      setLoading(false)
      
      // Reset file input to allow selecting more files
      const fileInput = document.getElementById('file-upload')
      if (fileInput) {
        fileInput.value = ''
      }
    } else {
      // Handle single file (existing logic)
      const selectedFile = selectedFiles[0]
      
      // Check file size limit
      if (selectedFile.size > 500 * 1024 * 1024) {
        const errorMessage = 'Mărimea fișierului trebuie să fie mai mică de 500MB'
        setError(errorMessage)
        showError(errorMessage)
        return
      }

      // Handle different file types
      if (selectedFile.type.startsWith('image/')) {
        try {
          setLoading(true)
          
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: selectedFile.type,
            initialQuality: 0.8,
            alwaysKeepResolution: false
          }
          
          const compressedFile = await imageCompression(selectedFile, options)
          setFile(compressedFile)
          setFiles([])
          setLoading(false)
        } catch (error) {
          console.error('Compression failed:', error)
          setFile(selectedFile)
          setFiles([])
          setLoading(false)
        }
      } else {
        // For videos, use original file
        setFile(selectedFile)
        setFiles([])
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError(t('title'))
      return
    }
    
    if (isMultiPhoto && files.length === 0) {
      setError(t('uploadPhotos'))
      return
    }
    
    if (!isMultiPhoto && !file) {
      setError(t('selectFiles'))
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isMultiPhoto) {
        // Handle multiple files upload
        const imageUrls = []
        
        for (const [index, fileToUpload] of files.entries()) {
          const fileExt = fileToUpload.name.split('.').pop()
          const fileName = `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `${familyId}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('album_uploads')
            .upload(filePath, fileToUpload)

          if (uploadError) {
            throw uploadError
          }

          const { data: publicUrlData } = supabase.storage
            .from('album_uploads')
            .getPublicUrl(filePath)

          imageUrls.push(publicUrlData.publicUrl)
        }

        // Save multi-photo post via API
        const response = await fetch('/api/posts/create-multi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            familyId,
            title: title.trim(),
            description: description.trim(),
            imageUrls,
            category: category,
            hashtags: hashtags.map(tag => `#${tag}`).join(' '),
            selectedChildren,
            customDate
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || t('error'))
        }

        // Handle child associations for multi-photo posts
        if (albumSettings?.is_multi_child && selectedChildren.length > 0) {
          const childResponse = await fetch('/api/child-posts/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              photoId: result.post.id,
              childIds: selectedChildren
            })
          })

          if (!childResponse.ok) {
            console.warn('Child association failed, but photo was uploaded successfully')
          }
        }
      } else {
        // Handle single file upload (existing logic)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${familyId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('album_uploads')
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage
          .from('album_uploads')
          .getPublicUrl(filePath)

        // Save photo metadata via API
        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            familyId,
            title: title.trim(),
            description: description.trim(),
            fileUrl: publicUrlData.publicUrl,
            fileType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other',
            category: category,
            hashtags: hashtags.map(tag => `#${tag}`).join(' '),
            selectedChildren,
            customDate
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || t('error'))
        }

        // Handle child associations for single photo posts
        if (albumSettings?.is_multi_child && selectedChildren.length > 0) {
          const childResponse = await fetch('/api/child-posts/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              photoId: result.photo.id,
              childIds: selectedChildren
            })
          })

          if (!childResponse.ok) {
            console.warn('Child association failed, but photo was uploaded successfully')
          }
        }
      }

      // Determine success message before resetting form
      let successMessage
      if (isMultiPhoto) {
        successMessage = t('success')
      } else {
        successMessage = t('success')
      }

      // Reset form
      setTitle('')
      setDescription('')
      setCategory('memories')
      setHashtags([])
      setCurrentHashtagInput('')
      setIsMultiPhoto(false)
      setFiles([])
      setFile(null)
      setCompressionInfo(null)
      setSelectedChildren([])
      
      showSuccess(successMessage)
      
      if (onUploadSuccess) {
        onUploadSuccess()
      }
      
      const fileInput = document.getElementById('file-upload')
      if (fileInput) {
        fileInput.value = ''
      }

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = `Încărcarea fișierului a eșuat: ${error.message}. Vă rugăm să încercați din nou.`
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={modalRef} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'auto',
      maxHeight: '85vh',
      minHeight: '70vh',
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Fixed Header */}
      <div style={{
        padding: '16px 20px 12px 20px',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0
      }}>
        <h2 className="text-section-title">{t('upload')}</h2>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        minHeight: 0,
        maxHeight: 'calc(85vh - 80px)'
      }}>
        {/* Title Input */}
        <div style={{ marginBottom: '16px' }}>
          <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
            Titlu
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder={t('titlePlaceholder')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            name="photo-title"
            id="photo-title"
            required
          />
        </div>

        {/* Description Input */}
        <div style={{ marginBottom: '16px' }}>
          <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
            Descriere
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            style={{ resize: 'none', minHeight: '80px' }}
            rows="3"
            placeholder={t('addDescription')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            name="photo-description"
            id="photo-description"
          />
        </div>
        
        {/* Category Selection - Interactive Pills */}
        <div style={{ marginBottom: '16px' }}>
          <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
            Categorie
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`category-pill ${
                  category === cat.value ? 'category-pill--selected' : 'category-pill--unselected'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Hashtags Input */}
        <div style={{ marginBottom: '16px' }}>
          <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
            Etichete
          </label>
          <div style={{
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '8px 12px',
            backgroundColor: 'white',
            minHeight: '44px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px'
          }}>
            {/* Display hashtag pills */}
            {hashtags.map((tag, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '400',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: '1.2',
                  height: 'auto',
                  minHeight: 'unset',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap'
                }}
              >
                #{tag}
              </span>
            ))}
            
            {/* Input for new hashtags */}
            <input
              type="text"
              value={currentHashtagInput}
              onChange={(e) => setCurrentHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKeyDown}
              placeholder={hashtags.length === 0 ? t('hashtagInputPlaceholder') : ""}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              name="photo-hashtags"
              id="photo-hashtags"
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                minWidth: '120px',
                padding: '4px 0',
                fontSize: '14px',
                backgroundColor: 'transparent'
              }}
            />
          </div>
          <p className="text-subtle" style={{ marginTop: '4px', fontSize: '12px' }}>
{t('hashtagInputHelp')}
          </p>
        </div>

        {/* Date Picker */}
        <div style={{ marginBottom: '16px' }}>
          <DatePicker
            value={customDate}
            onChange={setCustomDate}
            label={t('postDate')}
          />
        </div>

        {/* Children Selection - Only show if multi-child is enabled */}
        {albumSettings?.is_multi_child && children.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
{t('filterByChild')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
              padding: '12px',
              backgroundColor: 'var(--bg-gray)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)'
            }}>
              {children.map((child) => (
                <label
                  key={child.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: selectedChildren.includes(child.id) ? 'var(--accent-blue)' : 'white',
                    color: selectedChildren.includes(child.id) ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedChildren.includes(child.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChildren([...selectedChildren, child.id])
                      } else {
                        setSelectedChildren(selectedChildren.filter(id => id !== child.id))
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: selectedChildren.includes(child.id) ? 'rgba(255, 255, 255, 0.2)' : 'var(--accent-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {child.name}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-subtle" style={{ marginTop: '6px', fontSize: '11px' }}>
              Selectează copiii asociați cu această postare. Dacă nu selectezi niciun copil, postarea va fi considerată "comună".
            </p>
          </div>
        )}

        {/* File Upload */}
        {/* Multi-photo option */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={isMultiPhoto}
              onChange={(e) => {
                setIsMultiPhoto(e.target.checked)
                setFile(null)
                setFiles([])
                setError('')
              }}
              style={{
                width: '16px',
                height: '16px',
                accentColor: 'var(--accent-blue)'
              }}
            />
            📸 Mai multe poze (ca pe Instagram)
          </label>
          {isMultiPhoto && (
            <p className="text-subtle" style={{ marginTop: '4px', fontSize: '12px', marginLeft: '24px' }}>
              Selectează mai multe imagini pentru a crea o postare cu slide-uri
            </p>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="text-subtle" style={{ display: 'block', marginBottom: '8px' }}>
            {isMultiPhoto ? 'Imagini' : 'Fotografie/Video'}
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept={isMultiPhoto ? "image/*" : "image/*,video/*"}
            multiple={isMultiPhoto}
            className="input-field"
            style={{ 
              paddingTop: '8px', 
              paddingBottom: '8px',
              opacity: isMultiPhoto && files.length >= 10 ? 0.5 : 1,
              cursor: isMultiPhoto && files.length >= 10 ? 'not-allowed' : 'pointer'
            }}
            disabled={isMultiPhoto && files.length >= 10}
            required
          />
          <p className="text-subtle" style={{ marginTop: '4px', fontSize: '12px' }}>
            {isMultiPhoto 
              ? (files.length >= 10 
                  ? 'Limită atinsă: Maximum 10 imagini per postare.' 
                  : 'Formate acceptate: JPG, PNG, GIF. Maximum 10 imagini per postare. Selectează mai multe imagini deodată.')
              : 'Formate acceptate: JPG, PNG, GIF, MP4, MOV. Mărime maximă: 500MB'
            }
          </p>
          
          {/* File selected feedback */}
          {file && !isMultiPhoto && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#F0FDF4', 
              border: '1px solid #DCFCE7',
              borderRadius: '12px',
              color: '#15803D'
            }}>
              ✅ Fișier selectat cu succes!
            </div>
          )}

          {/* Multiple files selected feedback */}
          {files.length > 0 && isMultiPhoto && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#F0FDF4', 
              border: '1px solid #DCFCE7',
              borderRadius: '12px',
              color: '#15803D'
            }}>
              ✅ {files.length} {files.length === 1 ? 'imagine selectată' : 'imagini selectate'} din maximum 10
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', 
                gap: '8px', 
                marginTop: '8px' 
              }}>
                {files.slice(0, 6).map((file, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    backgroundColor: '#E5E7EB',
                    backgroundImage: `url(${URL.createObjectURL(file)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== index)
                        setFiles(newFiles)
                      }}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#DC2626',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                      title="Elimină imaginea"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {files.length > 6 && (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    backgroundColor: '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#6B7280',
                    fontWeight: '600'
                  }}>
                    +{files.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            marginBottom: '12px', 
            padding: '10px', 
            backgroundColor: '#FEF2F2', 
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#DC2626',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div style={{
        padding: '12px 24px 16px 24px',
        borderTop: '1px solid var(--border-light)',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'white',
        minHeight: '70px'
      }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary"
          style={{ minWidth: '140px' }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
{t('uploading')}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
{t('upload')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}