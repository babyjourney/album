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
        const warningMessage = t('maxFilesWarning')
        showError(warningMessage)
        break
      }

      if (selectedFile.size > 500 * 1024 * 1024) {
        const errorMessage = t('fileTooLarge', { fileName: selectedFile.name })
        setError(errorMessage)
        showError(errorMessage)
        continue
      }

      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        const errorMessage = t('invalidFileType', { fileName: selectedFile.name })
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
      const errorMessage = t('uploadFailed', { error: error.message })
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div ref={modalRef} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      width: '100%',
      background: isMobile 
        ? 'var(--bg-gray)'
        : 'var(--bg-secondary)'
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '8px 16px' : '8px 16px',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '10px' : '12px'
        }}>
          <div style={{
            width: isMobile ? '32px' : '36px',
            height: isMobile ? '32px' : '36px',
            background: 'var(--accent-blue)',
            borderRadius: isMobile ? '6px' : '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: isMobile ? '14px' : '15px', 
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>{t('createPost')}</h1>
            <p style={{
              margin: '1px 0 0 0',
              fontSize: isMobile ? '11px' : '11px',
              color: 'var(--text-secondary)'
            }}>{t('sharePhotosMemories')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '10px 16px' : '10px 16px',
        minHeight: 0,
        background: 'var(--bg-gray)'
      }}>
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'initial',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '10px' : '16px',
          maxWidth: isMobile ? '500px' : '100%',
          margin: '0 auto'
        }}>
          
          {/* File Upload Section */}
          <div>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '10px' : '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-light)'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {t('uploadPhotosVideos')}
              </h3>
              
              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  borderRadius: isMobile ? '8px' : '10px',
                  padding: isMobile ? '16px 12px' : '20px 16px',
                  textAlign: 'center',
                  background: dragOver ? 'var(--accent-blue-light)' : 'var(--bg-gray)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <div style={{
                  fontSize: isMobile ? '28px' : '32px',
                  marginBottom: isMobile ? '6px' : '8px',
                  opacity: dragOver ? 1 : 0.6
                }}>
                  {dragOver ? '📤' : '📁'}
                </div>
                <h4 style={{
                  margin: '0 0 4px 0',
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {dragOver ? t('dropFilesHere') : t('chooseFiles')}
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '11px' : '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.3'
                }}>
                  {isMobile 
                    ? `${t('fileTypesSupported')} • ${t('maxFiles')}`
                    : `${t('dragAndDropBrowse')} • ${t('fileTypesSupported')} • ${t('maxFiles')}`
                  }
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

              {/* File Preview Grid with Thumbnail Selection */}
              {files.length > 0 && (
                <div style={{
                  padding: isMobile ? '10px' : '12px',
                  background: 'var(--bg-gray)',
                  borderRadius: isMobile ? '8px' : '10px',
                  border: '1px solid var(--border-light)',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: isMobile ? '6px' : '8px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      {files.length} {t('filesSelected')}
                    </h4>
                    {files.length > 1 && (
                      <span style={{
                        fontSize: isMobile ? '10px' : '11px',
                        color: 'var(--text-secondary)',
                        fontWeight: '500'
                      }}>
                        {t('tapForThumbnail')}
                      </span>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile 
                      ? 'repeat(auto-fill, minmax(60px, 1fr))' 
                      : 'repeat(auto-fill, minmax(70px, 1fr))',
                    gap: isMobile ? '6px' : '8px'
                  }}>
                    {files.map((file, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: isMobile ? '8px' : '10px',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        border: index === coverIndex 
                          ? '2px solid var(--accent-blue)' 
                          : '1px solid var(--border-primary)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        boxShadow: index === coverIndex 
                          ? '0 4px 12px rgba(59, 130, 246, 0.15)' 
                          : 'var(--shadow-sm)'
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
                            fontSize: isMobile ? '16px' : '18px',
                            background: 'var(--accent-blue)',
                            color: 'white'
                          }}>
                            🎥
                          </div>
                        )}
                        
                        {/* Thumbnail Badge */}
                        {index === coverIndex && files.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            bottom: '3px',
                            left: '3px',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            fontSize: isMobile ? '8px' : '9px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {t('thumbnail')}
                          </div>
                        )}
                        
                        {/* Remove Button */}
                        <div
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
                            top: isMobile ? '2px' : '3px',
                            right: isMobile ? '2px' : '3px',
                            padding: isMobile ? '2px 4px' : '3px 6px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: isMobile ? '12px' : '11px',
                            fontWeight: '600',
                            borderRadius: isMobile ? '8px' : '6px',
                            lineHeight: '1',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--accent-red)'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.9)'
                          }}
                        >
                          ×
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories, Date Picker, and Children (Desktop only in left column) */}
              {!isMobile && (
                <>
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      {t('category')}
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      {categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: '500',
                            border: '1px solid',
                            borderColor: category === cat.value ? 'var(--accent-blue)' : 'var(--border-primary)',
                            borderRadius: '6px',
                            background: category === cat.value ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                            color: category === cat.value ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <label style={{ 
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      {t('postDate')}
                    </label>
                    <DatePicker
                      value={customDate}
                      onChange={setCustomDate}
                      label=""
                    />
                  </div>

                  {/* Children Selection - Desktop */}
                  {albumSettings?.is_multi_child && children.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ 
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {t('associatedChildren')}
                      </label>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}>
                        {children.map((child) => (
                          <label
                            key={child.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: selectedChildren.includes(child.id) ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                              color: selectedChildren.includes(child.id) ? 'white' : 'var(--text-primary)',
                              border: '1px solid',
                              borderColor: selectedChildren.includes(child.id) ? 'var(--accent-blue)' : 'var(--border-primary)',
                              transition: 'all 0.2s ease',
                              fontSize: '11px'
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
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: selectedChildren.includes(child.id) ? 'rgba(255, 255, 255, 0.3)' : 'var(--accent-blue)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              fontWeight: '600',
                              color: 'white',
                              backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: '500' }}>
                              {child.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Form Fields Section */}
          <div>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '10px' : '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-light)'
            }}>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {t('postDetails')}
              </h3>

              {/* Title Input */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {t('title')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder={t('enterPostTitle')}
                  required
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {t('description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    minHeight: '50px',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    lineHeight: '1.3'
                  }}
                  rows="2"
                  placeholder={t('tellStory')}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
              </div>

              {/* Hashtags */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {t('hashtags')}
                  </label>
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-gray)',
                    padding: '1px 4px',
                    borderRadius: '3px'
                  }}>
                    {hashtags.length}/10
                  </span>
                </div>
                <div style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  background: 'var(--bg-secondary)',
                  minHeight: '32px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'border-color 0.2s ease',
                  cursor: 'text'
                }}
                onClick={() => document.querySelector('#hashtag-input').focus()}
                >
                  {hashtags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'var(--accent-blue)',
                        color: 'white',
                        padding: isMobile ? '2px 4px' : '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      #{tag}
                      <div
                        onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                        style={{
                          background: 'rgba(255, 255, 255, 0.3)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: isMobile ? '8px' : '10px',
                          padding: isMobile ? '1px' : '2px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          minWidth: isMobile ? '12px' : '14px',
                          minHeight: isMobile ? '12px' : '14px'
                        }}
                      >
                        ×
                      </div>
                    </span>
                  ))}
                  
                  <input
                    id="hashtag-input"
                    type="text"
                    value={currentHashtagInput}
                    onChange={(e) => setCurrentHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder={hashtags.length === 0 ? t('addHashtags') : ""}
                    disabled={hashtags.length >= 10}
                    style={{
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: '60px',
                      padding: '2px 0',
                      fontSize: '11px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Categories (Mobile only) */}
              {isMobile && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {t('category')}
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: '6px'
                  }}>
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid',
                          borderColor: category === cat.value ? 'var(--accent-blue)' : 'var(--border-primary)',
                          borderRadius: '6px',
                          background: category === cat.value ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                          color: category === cat.value ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Picker (Mobile only) */}
              {isMobile && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ 
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {t('postDate')}
                  </label>
                  <DatePicker
                    value={customDate}
                    onChange={setCustomDate}
                    label=""
                  />
                </div>
              )}
            </div>

            {/* Children Selection - Mobile Only */}
            {isMobile && albumSettings?.is_multi_child && children.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--border-light)',
                marginBottom: '8px'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {t('associatedChildren')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '6px'
                }}>
                  {children.map((child) => (
                    <label
                      key={child.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: selectedChildren.includes(child.id) ? 'var(--accent-blue)' : 'var(--bg-gray)',
                        color: selectedChildren.includes(child.id) ? 'white' : 'var(--text-primary)',
                        border: '1px solid',
                        borderColor: selectedChildren.includes(child.id) ? 'var(--accent-blue)' : 'var(--border-light)',
                        transition: 'all 0.2s ease',
                        fontSize: '11px'
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
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: selectedChildren.includes(child.id) ? 'rgba(255, 255, 255, 0.3)' : 'var(--accent-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}>
                        {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '500', flex: 1 }}>
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
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                padding: '10px 12px',
                border: '1px solid var(--accent-red)',
                marginBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: '14px' }}>⚠️</span>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--accent-red)',
                    fontWeight: '500'
                  }}>
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: isMobile ? '8px 16px' : '10px 16px',
        borderTop: '1px solid var(--border-light)',
        flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '10px' : '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '12px' : '13px',
            order: isMobile ? '2' : '1'
          }}>
            {files.length > 0 && (
              <>
                <span style={{
                  background: 'var(--accent-blue-light)',
                  color: 'var(--accent-blue)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: '500'
                }}>
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                <span>•</span>
              </>
            )}
            <span>
              {files.length > 0 
                ? t('readyToPublish')
                : t('selectFilesToStart')}
            </span>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || files.length === 0}
            style={{
              padding: isMobile ? '12px 20px' : '14px 24px',
              background: loading || !title.trim() || files.length === 0
                ? 'var(--border-light)'
                : 'var(--accent-blue)',
              color: loading || !title.trim() || files.length === 0 ? 'var(--text-subtle)' : 'white',
              border: 'none',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: '600',
              cursor: loading || !title.trim() || files.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? '100%' : '120px',
              order: isMobile ? '1' : '2'
            }}
            onMouseOver={(e) => {
              if (!loading && title.trim() && files.length > 0) {
                e.target.style.background = 'var(--accent-blue)'
              }
            }}
            onMouseOut={(e) => {
              if (!loading && title.trim() && files.length > 0) {
                e.target.style.background = 'var(--accent-blue)'
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                {t('publishing')}
              </>
            ) : (
              <>
                {t('publishPost')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}