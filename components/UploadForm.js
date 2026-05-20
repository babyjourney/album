import { useState, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { authenticatedFetch, getFamilyPackage } from '../lib/pinAuth'
import { useToast } from '../contexts/ToastContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'
import { getPackageLimits } from '../lib/packages'

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
  const [isPrivate, setIsPrivate] = useState(false)
  // Family's package tier — drives client-side video duration limits.
  // Seeded synchronously from the cached session, then refreshed from
  // /api/families/get on mount so a server-side change takes effect on next
  // upload attempt without forcing the family to log out.
  const [currentPackage, setCurrentPackage] = useState(() => {
    if (typeof window === 'undefined') return 'free'
    try { return getFamilyPackage() } catch { return 'free' }
  })
  // Per-file duration (seconds) for video files. Aligned by index with
  // `files`; entries are `null` for images. Sent to the server so it can
  // re-validate even if the client lied.
  const [videoDurations, setVideoDurations] = useState([])
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const modalRef = useRef(null)
  // Tracks whether the user has explicitly changed the date via the picker.
  // DatePicker auto-fills today's date on mount when value is null; we treat
  // that as a non-user change so EXIF can still override it.
  const userTouchedDateRef = useRef(false)
  const customDateRef = useRef(customDate)
  customDateRef.current = customDate

  const handleCustomDateChange = (newValue) => {
    // If we're going from null -> a value, that's DatePicker's auto-init to
    // "today" — not a real user action. Any change after that (including
    // changing day/month/year dropdowns) means the user has touched the date.
    if (customDateRef.current !== null) {
      userTouchedDateRef.current = true
    }
    setCustomDate(newValue)
  }

  // Reads the duration of a video file (in seconds) using an off-DOM
  // <video> element. Returns null if metadata can't be read — the server
  // will catch oversize uploads anyway, so we fail open here rather than
  // blocking the user on a browser quirk.
  const probeVideoDuration = (file) => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        let settled = false
        const finish = (value) => {
          if (settled) return
          settled = true
          try { URL.revokeObjectURL(url) } catch {}
          resolve(value)
        }
        video.onloadedmetadata = () => {
          const d = Number.isFinite(video.duration) ? video.duration : null
          finish(d)
        }
        video.onerror = () => finish(null)
        // Safety timeout in case the browser never fires loadedmetadata
        // (corrupted file, unsupported codec, etc.).
        setTimeout(() => finish(null), 10000)
        video.src = url
      } catch {
        resolve(null)
      }
    })
  }

  // Extracts a Date from a single file. For images, tries EXIF
  // (DateTimeOriginal then CreateDate). Falls back to file.lastModified for
  // videos or images without EXIF. Returns null if no usable date is found.
  const extractDateFromFile = async (file) => {
    if (!file) return null
    try {
      if (file.type && file.type.startsWith('image/')) {
        const exifr = (await import('exifr')).default
        const parsed = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']).catch(() => null)
        if (parsed) {
          const candidates = [parsed.DateTimeOriginal, parsed.CreateDate]
            .map(v => (v instanceof Date ? v : (v ? new Date(v) : null)))
            .filter(d => d && !isNaN(d.getTime()))
          if (candidates.length > 0) {
            // Use the earliest valid date.
            return new Date(Math.min(...candidates.map(d => d.getTime())))
          }
        }
      }
    } catch (err) {
      // Silently ignore — never break upload flow on EXIF failure.
      console.warn('EXIF parse failed for', file?.name, err)
    }
    if (file.lastModified) {
      const d = new Date(file.lastModified)
      if (!isNaN(d.getTime())) return d
    }
    return null
  }

  useOnClickOutside(modalRef, onClose)

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

  // Refresh the family's package from the server on mount so changes made
  // by the admin take effect on the next render — without forcing logout.
  useEffect(() => {
    let cancelled = false
    const refreshPackage = async () => {
      if (!familyId) return
      try {
        const res = await authenticatedFetch(`/api/families/get?familyId=${familyId}`)
        if (!res.ok) return
        const json = await res.json()
        const pkg = json?.family?.package
        if (!cancelled && pkg) setCurrentPackage(pkg)
      } catch {
        // Non-fatal: cached package from session still applies.
      }
    }
    refreshPackage()
    return () => { cancelled = true }
  }, [familyId])

  useEffect(() => {
    const fetchChildrenData = async () => {
      try {
        const settingsResponse = await authenticatedFetch(`/api/album-settings/get?familyId=${familyId}`)
        const settingsResult = await settingsResponse.json()

        if (settingsResponse.ok) {
          setAlbumSettings(settingsResult.settings)

          if (settingsResult.settings?.is_multi_child) {
            const childrenResponse = await authenticatedFetch(`/api/children/list?familyId=${familyId}`)
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

    // Kick off EXIF/metadata date extraction in the background using the
    // ORIGINAL first file (before compression strips metadata). We don't
    // await this here — it must not block file selection / compression.
    // Only autofill if this is the first batch (no existing files) and the
    // user hasn't already chosen a date manually.
    if (files.length === 0 && !userTouchedDateRef.current) {
      const firstFile = selectedFiles[0]
      extractDateFromFile(firstFile).then((extracted) => {
        if (!extracted) return
        if (userTouchedDateRef.current) return
        // Set the date without flipping the user-touched flag.
        setCustomDate(extracted.toISOString())
      }).catch(() => {})
    }

    const processedFiles = [...files]
    const processedDurations = [...videoDurations]
    // Pad durations array if a previous render left it shorter than files.
    while (processedDurations.length < processedFiles.length) {
      processedDurations.push(null)
    }
    setLoading(true)

    const maxVideoSeconds = getPackageLimits(currentPackage).maxVideoSeconds
    let rejectedLongVideos = 0

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

      // Probe video duration BEFORE compression / acceptance so we can
      // reject over-limit files without wasting bandwidth on the upload.
      let videoDurationSec = null
      if (selectedFile.type.startsWith('video/')) {
        videoDurationSec = await probeVideoDuration(selectedFile)
        if (videoDurationSec !== null && videoDurationSec > maxVideoSeconds) {
          rejectedLongVideos += 1
          continue
        }
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
          processedDurations.push(null)
        } else {
          processedFiles.push(selectedFile)
          processedDurations.push(videoDurationSec)
        }
      } catch (error) {
        console.error('Processing failed for', selectedFile.name, error)
        processedFiles.push(selectedFile)
        processedDurations.push(selectedFile.type.startsWith('video/') ? videoDurationSec : null)
      }
    }

    if (rejectedLongVideos > 0) {
      const msg = rejectedLongVideos === 1
        ? `Un video a fost respins: durata maximă pentru pachetul ${currentPackage === 'premium' ? 'Premium' : 'Free'} este ${maxVideoSeconds} secunde. Treci la Premium pentru video-uri mai lungi.`
        : `${rejectedLongVideos} video-uri au fost respinse: durata maximă pentru pachetul ${currentPackage === 'premium' ? 'Premium' : 'Free'} este ${maxVideoSeconds} secunde. Treci la Premium pentru video-uri mai lungi.`
      setError(msg)
      showError(msg)
    }

    setFiles(processedFiles)
    setVideoDurations(processedDurations)
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

      // Mirror videoDurations to the upload's URL order. Align by index so
      // the server can re-validate against the family's package limit.
      const durationsForUpload = files.map((_, i) => videoDurations[i] ?? null)

      const requestData = {
        title: title.trim(),
        description: description.trim(),
        imageUrls,
        category: category,
        hashtags: hashtags.map(tag => `#${tag}`).join(' '),
        selectedChildren,
        customDate,
        isPrivate,
        videoDurations: durationsForUpload
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

      setTitle('')
      setDescription('')
      setCategory('memories')
      setHashtags([])
      setCurrentHashtagInput('')
      setFiles([])
      setVideoDurations([])
      setCompressionInfo(null)
      setSelectedChildren([])
      setCoverIndex(0)
      setCustomDate(null)
      setIsPrivate(false)
      userTouchedDateRef.current = false

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

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  const transition = `all 220ms ${ease}`

  return (
    <div ref={modalRef} style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'transparent',
      color: 'var(--ink-1)'
    }}>
      <div style={{
        padding: isMobile ? '14px 18px' : '18px 22px',
        borderBottom: '1px solid var(--glass-hairline)',
        flexShrink: 0,
        background: 'transparent'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '12px' : '14px'
        }}>
          <div style={{
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 8px 24px -8px rgba(124, 58, 237, 0.55)'
          }}>
            <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div>
            <h1 className="text-section-title" style={{ margin: 0 }}>
              {t('createPost')}
            </h1>
            <p className="text-subtle" style={{ margin: '2px 0 0 0' }}>
              {t('sharePhotosMemories')}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '14px 18px' : '18px 22px',
        minHeight: 0,
        background: 'transparent'
      }}>
        <div className="upload-form-grid" style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'initial',
          gap: isMobile ? '12px' : '18px',
          maxWidth: isMobile ? '500px' : '100%',
          margin: '0 auto'
        }}>

          <div>
            <div className="card-glass" style={{
              padding: isMobile ? '14px' : '16px',
              borderRadius: isMobile ? '20px' : '22px'
            }}>
              <h3 className="text-eyebrow" style={{
                margin: '0 0 12px 0'
              }}>
                {t('uploadPhotosVideos')}
              </h3>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-iris)' : 'var(--glass-hairline-strong)'}`,
                  borderRadius: isMobile ? '16px' : '18px',
                  padding: isMobile ? '20px 14px' : '26px 18px',
                  textAlign: 'center',
                  background: dragOver ? 'rgba(124, 58, 237, 0.10)' : 'var(--glass-1)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  transition,
                  cursor: 'pointer',
                  marginBottom: '14px',
                  boxShadow: dragOver
                    ? 'inset 0 1px 0 0 var(--glass-hairline-strong), 0 0 0 4px rgba(124, 58, 237, 0.18)'
                    : 'inset 0 1px 0 0 var(--glass-hairline)'
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <div style={{
                  width: isMobile ? '44px' : '52px',
                  height: isMobile ? '44px' : '52px',
                  margin: '0 auto',
                  marginBottom: isMobile ? '10px' : '12px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: dragOver
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)'
                    : 'var(--glass-2)',
                  border: `1px solid ${dragOver ? 'rgba(255,255,255,0.18)' : 'var(--glass-hairline)'}`,
                  color: dragOver ? '#fff' : 'var(--accent-iris)',
                  transition,
                  boxShadow: dragOver
                    ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 8px 24px -8px rgba(124, 58, 237, 0.55)'
                    : 'inset 0 1px 0 0 var(--glass-hairline-strong)'
                }}>
                  <svg width={isMobile ? "20" : "24"} height={isMobile ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h4 className="text-body" style={{
                  margin: '0 0 4px 0',
                  fontWeight: 600,
                  color: 'var(--ink-1)'
                }}>
                  {dragOver ? t('dropFilesHere') : t('chooseFiles')}
                </h4>
                <p className="text-tertiary" style={{
                  margin: 0,
                  lineHeight: 1.4
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

              {files.length > 0 && (
                <div className="glass-soft" style={{
                  padding: isMobile ? '12px' : '14px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: isMobile ? '8px' : '10px'
                  }}>
                    <h4 className="text-eyebrow nums" style={{ margin: 0 }}>
                      {files.length} {t('filesSelected')}
                    </h4>
                    {files.length > 1 && (
                      <span className="text-tertiary">
                        {t('tapForThumbnail')}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? 'repeat(auto-fill, minmax(64px, 1fr))'
                      : 'repeat(auto-fill, minmax(74px, 1fr))',
                    gap: isMobile ? '8px' : '10px'
                  }}>
                    {files.map((file, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: 'var(--glass-2)',
                        border: index === coverIndex
                          ? '2px solid var(--accent-iris)'
                          : '1px solid var(--glass-hairline)',
                        transition,
                        cursor: 'pointer',
                        boxShadow: index === coverIndex
                          ? '0 8px 24px -6px rgba(124, 58, 237, 0.45), inset 0 1px 0 0 rgba(255,255,255,0.20)'
                          : 'inset 0 1px 0 0 var(--glass-hairline-strong)'
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
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            color: '#fff'
                          }}>
                            <svg width={isMobile ? "18" : "22"} height={isMobile ? "18" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="23 7 16 12 23 17 23 7"/>
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                          </div>
                        )}

                        {index === coverIndex && files.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '2px 6px',
                            fontSize: isMobile ? '8px' : '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 10px -2px rgba(124, 58, 237, 0.45)'
                          }}>
                            {t('thumbnail')}
                          </div>
                        )}

                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            const newFiles = files.filter((_, i) => i !== index)
                            const newDurations = videoDurations.filter((_, i) => i !== index)
                            setFiles(newFiles)
                            setVideoDurations(newDurations)
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
                            width: isMobile ? '20px' : '22px',
                            height: isMobile ? '20px' : '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.55)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: '#fff',
                            cursor: 'pointer',
                            borderRadius: '999px',
                            lineHeight: 1,
                            transition,
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-red)' }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isMobile && (
                <>
                  <div style={{ marginTop: '14px' }}>
                    <label className="text-eyebrow" style={{
                      display: 'block',
                      marginBottom: '8px'
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
                          className={`category-pill${category === cat.value ? ' category-pill--selected sheen' : ''}`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <label className="text-eyebrow" style={{
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      {t('postDate')}
                    </label>
                    <DatePicker
                      value={customDate}
                      onChange={handleCustomDateChange}
                      label=""
                    />
                  </div>

                  {albumSettings?.is_multi_child && children.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <label className="text-eyebrow" style={{
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        {t('associatedChildren')}
                      </label>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}>
                        {children.map((child) => {
                          const isSelected = selectedChildren.includes(child.id)
                          return (
                            <label
                              key={child.id}
                              className={`category-pill${isSelected ? ' category-pill--selected sheen' : ''}`}
                              style={{ cursor: 'pointer', gap: '8px' }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
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
                                background: isSelected ? 'rgba(255, 255, 255, 0.30)' : 'var(--glass-3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: 700,
                                color: isSelected ? '#fff' : 'var(--ink-1)',
                                backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: '1px solid rgba(255,255,255,0.20)'
                              }}>
                                {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 500 }}>
                                {child.name}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="card-glass" style={{
              padding: isMobile ? '14px' : '16px',
              borderRadius: isMobile ? '20px' : '22px'
            }}>
              <h3 className="text-eyebrow" style={{
                margin: '0 0 12px 0'
              }}>
                {t('postDetails')}
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label className="text-eyebrow" style={{
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  {t('title')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-glass"
                  placeholder={t('enterPostTitle')}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="text-eyebrow" style={{
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  {t('description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-glass"
                  rows="2"
                  placeholder={t('tellStory')}
                  style={{
                    resize: 'none',
                    minHeight: '64px',
                    lineHeight: 1.4
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <label className="text-eyebrow">
                    {t('hashtags')}
                  </label>
                  <span className="glass-pill nums" style={{
                    fontSize: '10.5px',
                    color: 'var(--ink-2)',
                    padding: '2px 8px',
                    fontWeight: 600
                  }}>
                    {hashtags.length}/10
                  </span>
                </div>
                <div
                  className="input-glass"
                  style={{
                    minHeight: '44px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'text',
                    padding: '8px 10px'
                  }}
                  onClick={() => document.querySelector('#hashtag-input').focus()}
                >
                  {hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="glass-pill sheen"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(109, 40, 217, 0.22))',
                        color: 'var(--ink-1)',
                        padding: '3px 4px 3px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid rgba(124, 58, 237, 0.30)'
                      }}
                    >
                      #{tag}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setHashtags(hashtags.filter((_, i) => i !== index))
                        }}
                        style={{
                          background: 'rgba(124, 58, 237, 0.20)',
                          color: 'var(--accent-iris)',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          width: '16px',
                          height: '16px',
                          transition
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-iris)'; e.currentTarget.style.color = '#fff' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.20)'; e.currentTarget.style.color = 'var(--accent-iris)' }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
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
                      fontSize: '13px',
                      backgroundColor: 'transparent',
                      color: 'var(--ink-1)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Private content toggle */}
              <div style={{ marginBottom: '12px' }}>
                <label
                  htmlFor="upload-private-toggle"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${isPrivate ? 'rgba(124, 58, 237, 0.45)' : 'var(--glass-hairline)'}`,
                    background: isPrivate ? 'rgba(124, 58, 237, 0.10)' : 'var(--glass-1)',
                    cursor: 'pointer',
                    transition
                  }}
                >
                  <input
                    id="upload-private-toggle"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{
                      marginTop: '3px',
                      accentColor: 'var(--accent-iris)',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink-1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Conținut privat <span aria-hidden="true">🔒</span>
                    </span>
                    <span className="text-subtle" style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
                      Vizibil doar pentru editori (părinți), nu și pentru vizualizatori.
                    </span>
                  </div>
                </label>
              </div>

              {isMobile && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="text-eyebrow" style={{
                    display: 'block',
                    marginBottom: '8px'
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
                        className={`category-pill${category === cat.value ? ' category-pill--selected sheen' : ''}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isMobile && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="text-eyebrow" style={{
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    {t('postDate')}
                  </label>
                  <DatePicker
                    value={customDate}
                    onChange={handleCustomDateChange}
                    label=""
                  />
                </div>
              )}
            </div>

            {isMobile && albumSettings?.is_multi_child && children.length > 0 && (
              <div className="card-glass" style={{
                padding: '14px',
                marginTop: '12px',
                marginBottom: '12px',
                borderRadius: '20px'
              }}>
                <label className="text-eyebrow" style={{
                  display: 'block',
                  marginBottom: '10px'
                }}>
                  {t('associatedChildren')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '8px'
                }}>
                  {children.map((child) => {
                    const isSelected = selectedChildren.includes(child.id)
                    return (
                      <label
                        key={child.id}
                        className={`category-pill${isSelected ? ' category-pill--selected sheen' : ''}`}
                        style={{ cursor: 'pointer', gap: '8px' }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
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
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: isSelected ? 'rgba(255, 255, 255, 0.30)' : 'var(--glass-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: isSelected ? '#fff' : 'var(--ink-1)',
                          backgroundImage: child.profile_picture_url ? `url(${child.profile_picture_url})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '1px solid rgba(255,255,255,0.20)'
                        }}>
                          {!child.profile_picture_url && child.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, flex: 1 }}>
                          {child.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="glass-soft" style={{
                padding: '12px 14px',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                background: 'rgba(239, 68, 68, 0.10)',
                marginBottom: '10px',
                borderRadius: '14px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-red)',
                    flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--accent-red)',
                    fontWeight: 600
                  }}>
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        padding: isMobile ? '12px 18px' : '14px 22px',
        borderTop: '1px solid var(--glass-hairline)',
        flexShrink: 0,
        background: 'transparent'
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
            gap: '10px',
            color: 'var(--ink-2)',
            fontSize: isMobile ? '12px' : '13px',
            order: isMobile ? '2' : '1'
          }}>
            {files.length > 0 && (
              <>
                <span className="glass-pill nums" style={{
                  color: 'var(--accent-iris)',
                  padding: '3px 10px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 600,
                  background: 'rgba(124, 58, 237, 0.12)',
                  border: '1px solid rgba(124, 58, 237, 0.30)'
                }}>
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--ink-3)' }}>•</span>
              </>
            )}
            <span className="text-subtle">
              {files.length > 0
                ? t('readyToPublish')
                : t('selectFilesToStart')}
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || files.length === 0}
            className="btn-iris sheen"
            style={{
              padding: isMobile ? '13px 22px' : '13px 26px',
              fontSize: isMobile ? '14px' : '15px',
              minWidth: isMobile ? '100%' : '160px',
              order: isMobile ? '1' : '2'
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
