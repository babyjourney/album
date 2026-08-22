import { useState, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { authenticatedFetch, getFamilyPackage } from '../lib/pinAuth'
import { useToast } from '../contexts/ToastContext'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { useLanguage } from '../contexts/LanguageContext'
import DatePicker from './DatePicker'
import { getCategories } from '../lib/categoriesData'
import { getPackageLimits, getImageCompressionOptions, getVideoLimits, getVideoEncodeOptions, STORAGE_MAX_UPLOAD_MB, STORAGE_MAX_UPLOAD_BYTES } from '../lib/packages'
import { getTier } from '../lib/tiers'
import { UPLOAD_ACCEPT, isAcceptedUploadFile } from '../lib/fileTypes'
import { transcodeVideo, captureVideoPoster } from '../lib/videoCompress'
import { DEFAULT_CATEGORY_VALUE } from '../lib/defaultCategories'

// Small round reorder button (‹ ›) used on file thumbnails — works on touch.
const reorderBtnStyle = (disabled) => ({
  width: 22, height: 22, borderRadius: '999px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  fontSize: 15, lineHeight: 1, fontWeight: 700,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.35 : 1,
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
})

export default function UploadForm({ familyId, onUploadSuccess, onClose, refreshTrigger, selectedChildId = null }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY_VALUE)
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
  // Poster frames for video files, index-aligned with `files` (null for
  // non-videos). Captured at upload time so the feed never has to decode a
  // video just to show a thumbnail — that's what produced black tiles.
  const [posters, setPosters] = useState([])
  // Live progress while a video is being re-encoded. Encoding runs in real time
  // (a 60s clip takes ~60s), so without this the UI looks frozen.
  const [videoProgress, setVideoProgress] = useState(null) // { name, pct } | null
  // (Item 2) existing family hashtags for autocomplete suggestions.
  const [existingHashtags, setExistingHashtags] = useState([])
  // (Item 14) index of the file currently being dragged for reorder.
  const [dragReorderIndex, setDragReorderIndex] = useState(null)
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

  const addHashtag = (raw) => {
    const tag = String(raw).trim().toLowerCase().replace(/^#/, '')
    if (tag && !hashtags.includes(tag)) setHashtags((h) => [...h, tag])
    setCurrentHashtagInput('')
  }

  const handleHashtagKeyDown = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && currentHashtagInput.trim()) {
      e.preventDefault()
      addHashtag(currentHashtagInput)
    } else if (e.key === 'Backspace' && !currentHashtagInput && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1))
    }
  }

  // (Item 2) hashtag suggestions filtered by current input, excluding ones
  // already chosen. Show up to 8.
  const hashtagSuggestions = existingHashtags
    .filter((h) => !hashtags.includes(h))
    .filter((h) => !currentHashtagInput.trim() || h.includes(currentHashtagInput.trim().toLowerCase()))
    .slice(0, 8)

  // (Item 14) reorder selected files via drag; keep videoDurations and the
  // cover selection aligned with the moved item.
  const moveFile = (from, to) => {
    if (from === to || from == null || to == null) return
    setFiles((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
    setVideoDurations((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
    setPosters((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
    setCoverIndex((ci) => {
      if (ci === from) return to
      if (from < ci && to >= ci) return ci - 1
      if (from > ci && to <= ci) return ci + 1
      return ci
    })
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
              // (Item 6) Pre-select the child currently filtered in the feed so
              // new content lands on the right child by default. User can change it.
              if (selectedChildId && (childrenResult.children || []).some(c => c.id === selectedChildId)) {
                setSelectedChildren([selectedChildId])
              }
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
  }, [familyId, selectedChildId])

  // (Item 2) Load existing hashtags once for autocomplete suggestions.
  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    authenticatedFetch(`/api/hashtags/list?familyId=${familyId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success) setExistingHashtags(d.hashtags || []) })
      .catch(() => {})
    return () => { cancelled = true }
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
    const processedPosters = [...posters]
    // Pad the parallel arrays if a previous render left them shorter than files.
    while (processedDurations.length < processedFiles.length) {
      processedDurations.push(null)
    }
    while (processedPosters.length < processedFiles.length) {
      processedPosters.push(null)
    }
    setLoading(true)

    const maxVideoSeconds = getPackageLimits(currentPackage).maxVideoSeconds
    const videoLimits = getVideoLimits(currentPackage)
    const maxVideoBytes = videoLimits.maxMB * 1024 * 1024
    const videoEncodeOptions = getVideoEncodeOptions(currentPackage)
    let rejectedLongVideos = 0
    let rejectedLargeVideos = 0
    // Videos that are still over the storage limit even AFTER re-encoding —
    // i.e. the browser couldn't compress them. See the guard below.
    let rejectedOversizeAfterCompression = 0
    // Non-video files (audio, PDFs) that are simply too big for the bucket.
    let rejectedOversizeFiles = 0

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

      // Accept images, videos, audio and documents/PDFs (all tiers).
      if (!isAcceptedUploadFile(selectedFile)) {
        const errorMessage = t('invalidFileType', { fileName: selectedFile.name })
        setError(errorMessage)
        showError(errorMessage)
        continue
      }

      // Probe video duration BEFORE compression / acceptance so we can
      // reject over-limit files without wasting bandwidth on the upload.
      let videoDurationSec = null
      if (selectedFile.type.startsWith('video/')) {
        // Tier-based byte cap (Task #15) — Premium gets larger video budget.
        if (selectedFile.size > maxVideoBytes) {
          rejectedLargeVideos += 1
          continue
        }
        videoDurationSec = await probeVideoDuration(selectedFile)
        // (Sergiu 29.07 #3) Compare whole seconds. Phone cameras report a clip
        // the gallery shows as "1:00" as 60.3–60.9s; the limit is "up to one
        // minute", so 60.9s must pass and 61.0s must not — same rounding the
        // phone itself uses.
        if (videoDurationSec !== null && Math.floor(videoDurationSec) > maxVideoSeconds) {
          rejectedLongVideos += 1
          continue
        }
      }

      try {
        if (selectedFile.type.startsWith('image/')) {
          // Tier-based compression (Task #15): Free uses tighter caps for
          // SD quality, Premium uses higher caps for HD. See lib/packages.js.
          const options = {
            ...getImageCompressionOptions(currentPackage),
            fileType: selectedFile.type,
          }

          const compressedFile = await imageCompression(selectedFile, options)
          processedFiles.push(compressedFile)
          processedDurations.push(null)
          processedPosters.push(null)
        } else if (selectedFile.type.startsWith('video/')) {
          // (Items 2, 3, 7) Grab a poster frame, then re-encode the clip down to
          // the tier's resolution/bitrate. A 126MB phone video becomes ~12MB,
          // which both fits the storage bucket and stops the storage bill from
          // tracking the raw camera output.
          setVideoProgress({ name: selectedFile.name, pct: 0 })

          const poster = await captureVideoPoster(selectedFile)

          // Bits per second × seconds must stay under the storage ceiling, or
          // a 10-minute Family/Legacy clip encodes for ten real-time minutes
          // and is then rejected. Cap the tier bitrate per file (10% margin,
          // ~128 kbps reserved for audio).
          const encodeOptions = { ...videoEncodeOptions }
          if (videoDurationSec && videoDurationSec > 0) {
            const maxVideoBps = Math.floor((STORAGE_MAX_UPLOAD_BYTES * 8 * 0.9) / videoDurationSec) - 128_000
            if (maxVideoBps < encodeOptions.videoBitsPerSecond) {
              encodeOptions.videoBitsPerSecond = Math.max(400_000, maxVideoBps)
            }
          }

          const { file: encoded, transcoded } = await transcodeVideo(selectedFile, {
            ...encodeOptions,
            onProgress: (p) =>
              setVideoProgress({ name: selectedFile.name, pct: Math.round(p * 100) }),
          })

          if (!transcoded) {
            // Browser couldn't re-encode (or the result was no smaller). The
            // original still uploads — it just won't be shrunk.
            console.info('[upload] video not transcoded, using original:', selectedFile.name)
          }

          setVideoProgress(null)

          // The size that matters is the size AFTER re-encoding, not before.
          // If the browser couldn't transcode (no MediaRecorder, an encode
          // error, or the tab was backgrounded), `encoded` IS the original — so
          // a 126MB clip would go straight to Supabase and come back with
          // "The object exceeded the maximum allowed size", which is exactly the
          // bug we're supposed to be fixing. Refuse here, with an explanation.
          if (encoded.size > STORAGE_MAX_UPLOAD_BYTES) {
            rejectedOversizeAfterCompression += 1
            continue
          }

          processedFiles.push(encoded)
          processedDurations.push(videoDurationSec)
          processedPosters.push(poster)
        } else {
          // Audio, documents — stored as-is, so nothing shrinks them. They hit
          // the same bucket ceiling as an untranscodable video.
          if (selectedFile.size > STORAGE_MAX_UPLOAD_BYTES) {
            rejectedOversizeFiles += 1
            continue
          }
          processedFiles.push(selectedFile)
          processedDurations.push(null)
          processedPosters.push(null)
        }
      } catch (error) {
        console.error('Processing failed for', selectedFile.name, error)
        setVideoProgress(null)
        processedFiles.push(selectedFile)
        processedDurations.push(selectedFile.type.startsWith('video/') ? videoDurationSec : null)
        processedPosters.push(null)
      }
    }

    if (rejectedLongVideos > 0) {
      const packageName = getTier(currentPackage).label
      const msg = rejectedLongVideos === 1
        ? t('videoRejectedDurationOne', { package: packageName, seconds: maxVideoSeconds })
        : t('videoRejectedDurationMany', { count: rejectedLongVideos, package: packageName, seconds: maxVideoSeconds })
      setError(msg)
      showError(msg)
    }
    if (rejectedLargeVideos > 0) {
      const packageName = `${getTier(currentPackage).label} (${videoLimits.label})`
      const msg = rejectedLargeVideos === 1
        ? t('videoRejectedSizeOne', { package: packageName, maxMB: videoLimits.maxMB })
        : t('videoRejectedSizeMany', { count: rejectedLargeVideos, package: packageName, maxMB: videoLimits.maxMB })
      setError(msg)
      showError(msg)
    }
    // The browser couldn't re-encode the clip, and the original is over the
    // storage ceiling. Say so plainly — otherwise Supabase returns the opaque
    // "The object exceeded the maximum allowed size" that started all this.
    if (rejectedOversizeAfterCompression > 0) {
      const msg = t('videoCompressFailedTooLarge', {
        count: rejectedOversizeAfterCompression,
        maxMB: STORAGE_MAX_UPLOAD_MB,
      })
      setError(msg)
      showError(msg)
    }
    if (rejectedOversizeFiles > 0) {
      const msg = t('fileRejectedTooLargeForStorage', {
        count: rejectedOversizeFiles,
        maxMB: STORAGE_MAX_UPLOAD_MB,
      })
      setError(msg)
      showError(msg)
    }

    setFiles(processedFiles)
    setVideoDurations(processedDurations)
    setPosters(processedPosters)
    setVideoProgress(null)
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

    // (Item 11) A post needs a title or a description; media is optional (a
    // post with only title+description is a text post).
    if (!title.trim() && !description.trim()) {
      setError(t('titleOrDescriptionRequired'))
      return
    }

    // (Item 3a) In multi-child albums, force choosing at least one child so the
    // post is navigable per child (not only under "all kids").
    if (albumSettings?.is_multi_child && selectedChildren.length === 0) {
      setError(t('selectAtLeastOneChild'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const imageUrls = []
      // Index-aligned with imageUrls: the poster URL for each video, null for
      // everything else. Lets the feed render a real thumbnail without
      // downloading the video (item 2).
      const posterUrls = []

      const uploadToStorage = async (fileToUpload, index, suffix = '') => {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `${Date.now()}-${index}${suffix}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${familyId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('album_uploads')
          .upload(filePath, fileToUpload)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('album_uploads')
          .getPublicUrl(filePath)

        return publicUrlData.publicUrl
      }

      for (const [index, fileToUpload] of files.entries()) {
        imageUrls.push(await uploadToStorage(fileToUpload, index))

        const poster = posters[index]
        if (poster) {
          try {
            posterUrls.push(await uploadToStorage(poster, index, '-poster'))
          } catch (posterErr) {
            // A missing poster degrades to the old runtime-capture path; it is
            // never worth failing the whole post over.
            console.warn('Poster upload failed:', posterErr)
            posterUrls.push(null)
          }
        } else {
          posterUrls.push(null)
        }
      }

      // Mirror videoDurations to the upload's URL order. Align by index so
      // the server can re-validate against the family's package limit.
      const durationsForUpload = files.map((_, i) => videoDurations[i] ?? null)

      // (Item 7) Real byte sizes of what we actually stored — AFTER compression.
      // The admin storage figure used to be a hardcoded 2MB-per-file guess.
      const fileSizes = files.map((f) => f.size)

      const requestData = {
        title: title.trim(),
        description: description.trim(),
        imageUrls,
        posterUrls,
        fileSizes,
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
        throw new Error((result.errorKey ? t(result.errorKey) : result.error) || t('error'))
      }

      // Child associations are linked server-side by /api/posts/create-multi
      // (from selectedChildren) — no separate child-posts/create call, which
      // would create duplicate child_posts rows.

      const successMessage = t('success')

      setTitle('')
      setDescription('')
      setCategory(DEFAULT_CATEGORY_VALUE)
      setHashtags([])
      setCurrentHashtagInput('')
      setFiles([])
      setVideoDurations([])
      setPosters([])
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

  // Quality badge. This used to test `currentPackage === 'premium'` — a tier
  // that no longer exists (they're starter/family/legacy now), so Family and
  // Legacy families were shown "SD" and told their limits were the "Free" ones.
  const isHd = getPackageLimits(currentPackage).imageQuality === 'hd'

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
        padding: isMobile ? '10px 16px' : '12px 20px',
        borderBottom: '1px solid var(--glass-hairline)',
        flexShrink: 0,
        background: 'transparent'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '12px'
        }}>
          <div style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
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
        padding: isMobile ? '10px 14px' : '12px 18px',
        minHeight: 0,
        background: 'transparent'
      }}>
        <div className="upload-form-grid" style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'initial',
          gap: isMobile ? '10px' : '14px',
          maxWidth: isMobile ? '500px' : '100%',
          margin: '0 auto'
        }}>

          <div>
            <div className="card-glass" style={{
              padding: isMobile ? '12px' : '14px',
              borderRadius: isMobile ? '18px' : '20px'
            }}>
              <h3 className="text-eyebrow" style={{
                margin: '0 0 10px 0'
              }}>
                {t('uploadPhotosVideos')}
              </h3>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-iris)' : 'var(--glass-hairline-strong)'}`,
                  borderRadius: isMobile ? '14px' : '16px',
                  padding: isMobile ? '14px 12px' : '18px 14px',
                  textAlign: 'center',
                  background: dragOver ? 'rgba(124, 58, 237, 0.10)' : 'var(--glass-1)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  transition,
                  cursor: 'pointer',
                  marginBottom: '10px',
                  boxShadow: dragOver
                    ? 'inset 0 1px 0 0 var(--glass-hairline-strong), 0 0 0 4px rgba(124, 58, 237, 0.18)'
                    : 'inset 0 1px 0 0 var(--glass-hairline)'
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <div style={{
                  width: isMobile ? '36px' : '42px',
                  height: isMobile ? '36px' : '42px',
                  margin: '0 auto',
                  marginBottom: isMobile ? '6px' : '8px',
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

                {/* Quality tier indicator (Task #15) */}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
                  <span className="glass-pill" style={{
                    padding: '3px 10px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: isHd ? 'var(--accent-iris)' : 'var(--ink-2)',
                    borderColor: isHd ? 'rgba(124,58,237,0.45)' : 'var(--glass-hairline)',
                    background: isHd ? 'rgba(124,58,237,0.12)' : 'var(--glass-1)'
                  }}>
                    {isHd ? '📷 HD · 🎬 HD video' : '📷 SD · 🎬 SD video'}
                  </span>
                </div>

                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept={UPLOAD_ACCEPT}
                  multiple={true}
                  style={{ display: 'none' }}
                  disabled={files.length >= 10}
                  required
                />
              </div>

              {/* Video re-encode progress. Encoding is real-time, so a 1-minute
                  clip takes ~1 minute — without this the form looks hung. */}
              {videoProgress && (
                <div className="glass-soft" style={{
                  padding: isMobile ? '12px' : '14px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 10, marginBottom: 8,
                  }}>
                    <span className="text-body" style={{ fontSize: 13, fontWeight: 600 }}>
                      {t('compressingVideo')}
                    </span>
                    <span className="nums" style={{ fontSize: 12, color: 'var(--accent-iris)', fontWeight: 700 }}>
                      {videoProgress.pct}%
                    </span>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 999, overflow: 'hidden',
                    background: 'var(--glass-3)',
                  }}>
                    <div style={{
                      width: `${videoProgress.pct}%`, height: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)',
                      borderRadius: 999,
                      transition: 'width 200ms linear',
                    }} />
                  </div>
                  <p className="text-subtle" style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.35 }}>
                    {t('compressingVideoHint')}
                  </p>
                </div>
              )}

              {files.length > 0 && (
                <div className="glass-soft" style={{
                  padding: isMobile ? '12px' : '14px',
                  marginBottom: '10px'
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
                      <div key={index}
                        draggable
                        onDragStart={(e) => { setDragReorderIndex(index); e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                        onDrop={(e) => { e.preventDefault(); moveFile(dragReorderIndex, index); setDragReorderIndex(null) }}
                        onDragEnd={() => setDragReorderIndex(null)}
                        style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: 'var(--glass-2)',
                        border: index === coverIndex
                          ? '2px solid var(--accent-iris)'
                          : '1px solid var(--glass-hairline)',
                        transition,
                        cursor: 'grab',
                        opacity: dragReorderIndex === index ? 0.5 : 1,
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
                        ) : posters[index] ? (
                          // Real frame from the video, captured at selection time.
                          <img
                            src={URL.createObjectURL(posters[index])}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                            const newPosters = posters.filter((_, i) => i !== index)
                            setFiles(newFiles)
                            setVideoDurations(newDurations)
                            setPosters(newPosters)
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

                        {/* (Item 14) touch-friendly reorder — works on mobile
                            where HTML5 drag does not. */}
                        {files.length > 1 && (
                          <div style={{
                            position: 'absolute', bottom: '4px', left: '4px', right: '4px',
                            display: 'flex', justifyContent: 'space-between', gap: '4px',
                          }}>
                            <button type="button" disabled={index === 0}
                              onClick={(e) => { e.stopPropagation(); moveFile(index, index - 1) }}
                              style={reorderBtnStyle(index === 0)}>‹</button>
                            <button type="button" disabled={index === files.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveFile(index, index + 1) }}
                              style={reorderBtnStyle(index === files.length - 1)}>›</button>
                          </div>
                        )}
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
              padding: isMobile ? '12px' : '14px',
              borderRadius: isMobile ? '18px' : '20px'
            }}>
              <h3 className="text-eyebrow" style={{
                margin: '0 0 12px 0'
              }}>
                {t('postDetails')}
              </h3>

              <div style={{ marginBottom: '10px' }}>
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

              <div style={{ marginBottom: '10px' }}>
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

              <div style={{ marginBottom: '10px' }}>
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

                {/* (Item 2) hashtag suggestions from previously-used tags */}
                {hashtags.length < 10 && hashtagSuggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {hashtagSuggestions.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => addHashtag(h)}
                        className="category-pill"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        #{h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Private content toggle */}
              <div style={{ marginBottom: '10px' }}>
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
                      {t('privateContent')} <span aria-hidden="true">🔒</span>
                    </span>
                    <span className="text-subtle" style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
                      {t('privateContentHint')}
                    </span>
                  </div>
                </label>
              </div>

              {isMobile && (
                <div style={{ marginBottom: '10px' }}>
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
                <div style={{ marginBottom: '10px' }}>
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
                marginBottom: '10px',
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
        padding: isMobile ? '10px 16px' : '10px 20px',
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
                  {files.length} {files.length !== 1 ? t('filePlural') : t('fileSingular')}
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
            disabled={loading || (!title.trim() && !description.trim()) || (albumSettings?.is_multi_child && selectedChildren.length === 0)}
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
