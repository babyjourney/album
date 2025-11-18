import { useState, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { authenticatedFetch } from '../lib/pinAuth'
import { useToast } from '../contexts/ToastContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'

export default function UploadForm({ familyId, onUploadSuccess, onClose, refreshTrigger }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('memories')
  const [files, setFiles] = useState([])
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
  const [coverIndex, setCoverIndex] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const modalRef = useRef(null)

  // Handle click outside to close modal
  useOnClickOutside(modalRef, onClose)

  // Load categories on mount and when refreshTrigger changes
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories()
        setCategories(cats)
      } catch (error) {
        console.error('Error loading categories:', error)
        setCategories([])
      }
    }
    loadCategories()
  }, [refreshTrigger])

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
        const settingsResponse = await fetch(`/api/album-settings/get?familyId=${familyId}`)
        const settingsResult = await settingsResponse.json()
        
        if (settingsResponse.ok) {
          setAlbumSettings(settingsResult.settings)
          
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

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    processFiles(selectedFiles)
  }

  const processFiles = async (selectedFiles) => {
    if (!selectedFiles.length) return

    setError('')
    setCompressionInfo(null)

    const totalFilesAfterAddition = files.length + selectedFiles.length
    if (totalFilesAfterAddition > 10) {
      const errorMessage = t('error')
      setError(errorMessage)
      showError(errorMessage)
      return
    }

    const processedFiles = [...files]
    setLoading(true)

    for (const selectedFile of selectedFiles) {
      const fileExists = processedFiles.some(existingFile => 
        existingFile.name === selectedFile.name && existingFile.size === selectedFile.size
      )
      
      if (fileExists) {
        console.log(`File ${selectedFile.name} already selected, skipping`)
        continue
      }

      if (processedFiles.length >= 10) {
        const warningMessage = `Maximum 10 fișiere sunt permise per postare. Restul fișierelor nu vor fi adăugate.`
        showError(warningMessage)
        break
      }

      if (selectedFile.size > 500 * 1024 * 1024) {
        const errorMessage = `Fișierul ${selectedFile.name} trebuie să fie mai mic de 500MB`
        setError(errorMessage)
        showError(errorMessage)
        continue
      }

      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        const errorMessage = `Pentru postări multiple sunt permise doar imagini și video-uri. ${selectedFile.name} nu este o imagine sau video.`
        setError(errorMessage)
        showError(errorMessage)
        continue
      }

      try {
        if (selectedFile.type.startsWith('image/')) {
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
        } else {
          processedFiles.push(selectedFile)
        }
      } catch (error) {
        console.error('Processing failed for', selectedFile.name, error)
        processedFiles.push(selectedFile)
      }
    }

    setFiles(processedFiles)
    setLoading(false)
    
    if (coverIndex >= processedFiles.length) {
      setCoverIndex(0)
    }
    
    const fileInput = document.getElementById('file-upload')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError(t('title'))
      return
    }
    
    if (files.length === 0) {
      setError(t('uploadPhotos'))
      return
    }

    setLoading(true)
    setError('')

    try {
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

      const requestData = {
        title: title.trim(),
        description: description.trim(),
        imageUrls,
        category: category,
        hashtags: hashtags.map(tag => `#${tag}`).join(' '),
        selectedChildren,
        customDate
      }

      if (imageUrls.length > 1) {
        requestData.coverIndex = coverIndex
      }

      const response = await authenticatedFetch('/api/posts/create-multi', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || t('error'))
      }

      if (albumSettings?.is_multi_child && selectedChildren.length > 0) {
        const childResponse = await authenticatedFetch('/api/child-posts/create', {
          method: 'POST',
          body: JSON.stringify({
            photoId: result.post.id,
            childIds: selectedChildren
          })
        })

        if (!childResponse.ok) {
          console.warn('Child association failed, but photo was uploaded successfully')
        }
      }

      const successMessage = t('success')

      // Reset form
      setTitle('')
      setDescription('')
      setCategory('memories')
      setHashtags([])
      setCurrentHashtagInput('')
      setFiles([])
      setCompressionInfo(null)
      setSelectedChildren([])
      setCoverIndex(0)
      
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
      height: '100%',
      width: '100%'
    }}>
      {/* Premium Header */}
      <div style={{
        padding: '32px 40px 24px 40px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.02) 0%, rgba(168, 85, 247, 0.02) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: '700',
              color: 'var(--text-primary)',
              lineHeight: '1.2'
            }}>Create New Post</h1>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '16px',
              color: 'var(--text-secondary)',
              fontWeight: '400'
            }}>Share your moments with beautiful memories</p>
          </div>
        </div>
      </div>

      {/* Premium Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        minHeight: 0
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          maxWidth: '1200px'
        }}>
          
          {/* Left Column - File Upload */}
          <div style={{ order: '1' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>📸 Photos & Videos</h3>
            
            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#667eea' : 'rgba(0, 0, 0, 0.1)'}`,
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                background: dragOver 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)'
                  : 'rgba(248, 250, 252, 0.5)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                position: 'relative',
                marginBottom: '24px'
              }}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: dragOver ? 1 : 0.6,
                transition: 'opacity 0.2s ease'
              }}>
                {dragOver ? '🎯' : '📁'}
              </div>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {dragOver ? 'Drop your files here' : 'Upload your media'}
              </h4>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                Drag and drop your photos and videos, or click to browse<br/>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                  Supports JPG, PNG, GIF, MP4, MOV • Max 10 files • Up to 500MB each
                </span>
              </p>
              
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                accept="image/*,video/*"
                multiple={true}
                style={{ display: 'none' }}
                disabled={files.length >= 10}
                required
              />
            </div>

            {/* File Preview Grid */}
            {files.length > 0 && (
              <div style={{
                padding: '24px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  ✨ {files.length} file{files.length !== 1 ? 's' : ''} selected
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '12px'
                }}>
                  {files.map((file, index) => (
                    <div key={index} style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#f8fafc',
                      border: index === coverIndex ? '3px solid #667eea' : '2px solid transparent',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCoverIndex(index)}
                    >
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white'
                        }}>
                          🎥
                        </div>
                      )}
                      
                      {/* Cover Badge */}
                      {index === coverIndex && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          COVER
                        </div>
                      )}
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const newFiles = files.filter((_, i) => i !== index)
                          setFiles(newFiles)
                          if (index === coverIndex && index === files.length - 1) {
                            setCoverIndex(Math.max(0, index - 1))
                          } else if (index < coverIndex) {
                            setCoverIndex(coverIndex - 1)
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#dc2626'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.9)'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form Fields */}
          <div style={{ order: '2' }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>✏️ Post Details</h3>

            {/* Title Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '15px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  background: 'white',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                placeholder="Give your post an amazing title..."
                required
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 0, 0, 0.06)'}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '15px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  background: 'white',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                rows="4"
                placeholder="Tell the story behind your photos..."
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 0, 0, 0.06)'}
              />
            </div>
            
            {/* Categories */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontSize: '15px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: '2px solid',
                      borderColor: category === cat.value ? '#667eea' : 'rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      background: category === cat.value 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'white',
                      color: category === cat.value ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: category === cat.value 
                        ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                        : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (category !== cat.value) {
                        e.target.style.borderColor = '#667eea'
                        e.target.style.background = 'rgba(102, 126, 234, 0.05)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (category !== cat.value) {
                        e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'
                        e.target.style.background = 'white'
                      }
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '15px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Hashtags
              </label>
              <div style={{
                border: '2px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '12px',
                padding: '12px',
                backgroundColor: 'white',
                minHeight: '50px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              >
                {hashtags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                <input
                  type="text"
                  value={currentHashtagInput}
                  onChange={(e) => setCurrentHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder={hashtags.length === 0 ? "Add hashtags (press space to add)..." : ""}
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
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Type a word and press space to create a hashtag
              </p>
            </div>

            {/* Date Picker */}
            <div style={{ marginBottom: '24px' }}>
              <DatePicker
                value={customDate}
                onChange={setCustomDate}
                label="Post Date"
              />
            </div>

            {/* Children Selection */}
            {albumSettings?.is_multi_child && children.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: '15px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  👶 Associated Children
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px'
                }}>
                  {children.map((child) => (
                    <label
                      key={child.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '12px',
                        borderRadius: '12px',
                        background: selectedChildren.includes(child.id) 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'white',
                        color: selectedChildren.includes(child.id) ? 'white' : 'var(--text-primary)',
                        border: '2px solid',
                        borderColor: selectedChildren.includes(child.id) ? '#667eea' : 'rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: selectedChildren.includes(child.id) 
                          ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                          : 'none'
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
                        background: selectedChildren.includes(child.id) 
                          ? 'rgba(255, 255, 255, 0.2)'
                          : '#667eea',
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
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '2px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                color: '#DC2626',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🚨 {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <div style={{
        padding: '24px 40px',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        flexShrink: 0,
        background: 'rgba(248, 250, 252, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          {files.length > 0 && (
            <>
              <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
              <span>•</span>
            </>
          )}
          <span>Ready to share your moment?</span>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || files.length === 0}
          style={{
            padding: '16px 32px',
            background: loading || !title.trim() || files.length === 0
              ? 'rgba(0, 0, 0, 0.1)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: loading || !title.trim() || files.length === 0 ? 'rgba(0, 0, 0, 0.4)' : 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || !title.trim() || files.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: loading || !title.trim() || files.length === 0
              ? 'none'
              : '0 8px 16px rgba(102, 126, 234, 0.3)',
            minWidth: '140px'
          }}
          onMouseOver={(e) => {
            if (!loading && title.trim() && files.length > 0) {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.4)'
            }
          }}
          onMouseOut={(e) => {
            if (!loading && title.trim() && files.length > 0) {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)'
            }
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Publishing...
            </>
          ) : (
            <>
              🚀 Publish Post
            </>
          )}
        </button>
      </div>
    </div>
  )
}