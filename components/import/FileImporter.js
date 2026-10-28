import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { authenticatedFetch, getFamilyPackage } from '../../lib/pinAuth'
import { UPLOAD_ACCEPT, UPLOAD_FORMAT_LABELS, classifyUploadFile, fileExtension } from '../../lib/fileTypes'
import { getPackageLimits, getImageCompressionOptions } from '../../lib/packages'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { captureVideoPoster, probeVideoDuration } from '../../lib/videoCompress'
import { convertImageToJpeg, canDecodeImage, withCanonicalType } from '../../lib/imageConvert'

const currentPackage = () => {
  try { return getFamilyPackage() } catch { return 'free' }
}

export default function FileImporter({ familyId }) {
  const inputRef = useRef(null)
  const folderRef = useRef(null)
  const [queue, setQueue] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  const maxVideoSeconds = getPackageLimits(currentPackage()).maxVideoSeconds

  const pick = (files) => {
    const accepted = Array.from(files || []).filter((file) => classifyUploadFile(file) !== null)
    const rejected = (files?.length || 0) - accepted.length
    if (rejected > 0) {
      showError(t('fileImporterRejectedFormats', {
        count: rejected,
        images: UPLOAD_FORMAT_LABELS.images,
        videos: UPLOAD_FORMAT_LABELS.videos,
      }))
    }
    setQueue(accepted)
    setDone(0); setFailed(0)
  }

  const prepareFile = async (file, pkg) => {
    const info = classifyUploadFile(file)
    if (!info) return { skip: 'format' }
    if (info.kind === 'video') {
      const duration = await probeVideoDuration(file)
      if (duration === null || Math.floor(duration) > getPackageLimits(pkg).maxVideoSeconds) {
        return { skip: 'video' }
      }
      return { file: withCanonicalType(file, info), kind: 'video', duration }
    }
    if (info.needsConversion) {
      try {
        return { file: await convertImageToJpeg(file, getImageCompressionOptions(pkg)), kind: 'image' }
      } catch (err) {
        console.warn('Import: image conversion failed for', file.name, err)
        return { skip: 'image' }
      }
    }
    const typed = withCanonicalType(file, info)
    if (!(await canDecodeImage(typed))) return { skip: 'image' }
    return { file: typed, kind: 'image' }
  }

  const run = async () => {
    if (!queue.length) return
    setRunning(true); setDone(0); setFailed(0)
    let ok = 0, bad = 0, skippedVideos = 0, skippedImages = 0
    const pkg = currentPackage()
    const uploadOne = async (blob, i, suffix = '') => {
      const ext = (fileExtension(blob.name) || classifyUploadFile(blob)?.ext || '.bin').slice(1)
      const path = `${familyId}/${Date.now()}-${i}${suffix}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('album_uploads').upload(path, blob)
      if (upErr) throw upErr
      return supabase.storage.from('album_uploads').getPublicUrl(path).data.publicUrl
    }

    for (const [i, original] of queue.entries()) {
      try {
        const prepared = await prepareFile(original, pkg)
        if (prepared.skip) {
          if (prepared.skip === 'video') skippedVideos += 1
          else skippedImages += 1
          bad += 1; setFailed(bad)
          continue
        }
        const { file, kind, duration } = prepared
        const publicUrl = await uploadOne(file, i)

        let posterUrls = null
        if (kind === 'video') {
          try {
            const poster = await captureVideoPoster(file)
            if (poster) posterUrls = [await uploadOne(poster, i, '-poster')]
          } catch (posterErr) {
            console.warn('Import: poster capture failed for', file.name, posterErr)
          }
        }

        const res = await authenticatedFetch('/api/posts/create-multi', {
          method: 'POST',
          body: JSON.stringify({
            title: original.name.replace(/\.[^.]+$/, '').slice(0, 200),
            description: '',
            imageUrls: [publicUrl],
            ...(posterUrls ? { posterUrls } : {}),
            ...(kind === 'video' ? { videoDurations: [duration] } : {}),
            hashtags: '#import',
          }),
        })
        if (!res.ok) throw new Error('create failed')
        ok += 1; setDone(ok)
      } catch (e) {
        bad += 1; setFailed(bad)
      }
    }
    setRunning(false)
    if (ok) showSuccess(t('fileImporterImported', { count: ok }))
    if (skippedVideos) showError(t('fileImporterSkippedVideos', { count: skippedVideos, seconds: getPackageLimits(pkg).maxVideoSeconds }))
    if (skippedImages) showError(t('fileImporterSkippedImages', { count: skippedImages }))
    const otherFailures = bad - skippedVideos - skippedImages
    if (otherFailures > 0) showError(t('fileImporterFailed', { count: otherFailures }))
    if (ok) setQueue([])
  }

  return (
    <div className="card-glass" style={{ padding: 20 }}>
      <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>📂 {t('fileImporterTitle')}</h3>
      <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>
        {t('fileImporterHelpMedia', {
          images: UPLOAD_FORMAT_LABELS.images,
          videos: UPLOAD_FORMAT_LABELS.videos,
          seconds: maxVideoSeconds,
        })}
      </p>

      <input ref={inputRef} type="file" multiple accept={UPLOAD_ACCEPT} style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files)} />
      <input ref={folderRef} type="file" multiple webkitdirectory="" directory="" style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files)} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => inputRef.current?.click()} disabled={running} className="btn-glass" style={{ padding: '9px 16px' }}>
          {t('chooseFiles')}
        </button>
        <button onClick={() => folderRef.current?.click()} disabled={running} className="btn-glass" style={{ padding: '9px 16px' }}>
          {t('fileImporterChooseFolder')}
        </button>
      </div>

      {queue.length > 0 && (
        <div className="glass-soft" style={{ padding: 14, borderRadius: 12 }}>
          <div style={{ marginBottom: 10, fontSize: 14 }}>
            {t('fileImporterQueue', { count: queue.length })}
            {running ? ` · ${t('fileImporterProgress', { done, total: queue.length })}` : ''}
            {failed > 0 ? ` · ${t('fileImporterFailedCount', { count: failed })}` : ''}
          </div>
          <button onClick={run} disabled={running} className="btn-iris sheen" style={{ padding: '10px 18px' }}>
            {running ? t('fileImporterImporting') : t('fileImporterImportBtn', { count: queue.length })}
          </button>
        </div>
      )}
    </div>
  )
}
