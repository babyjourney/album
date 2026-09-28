import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { authenticatedFetch } from '../../lib/pinAuth'
import { isAcceptedUploadFile } from '../../lib/fileTypes'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { captureVideoPoster } from '../../lib/videoCompress'

export default function FileImporter({ familyId }) {
  const inputRef = useRef(null)
  const folderRef = useRef(null)
  const [queue, setQueue] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

  const pick = (files) => {
    const accepted = Array.from(files || []).filter(isAcceptedUploadFile)
    const rejected = (files?.length || 0) - accepted.length
    if (rejected > 0) showError(t('fileImporterRejected', { count: rejected }))
    setQueue(accepted)
    setDone(0); setFailed(0)
  }

  const run = async () => {
    if (!queue.length) return
    setRunning(true); setDone(0); setFailed(0)
    let ok = 0, bad = 0
    const uploadOne = async (blob, i, suffix = '') => {
      const ext = (blob.name.split('.').pop() || 'bin').toLowerCase()
      const path = `${familyId}/${Date.now()}-${i}${suffix}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('album_uploads').upload(path, blob)
      if (upErr) throw upErr
      return supabase.storage.from('album_uploads').getPublicUrl(path).data.publicUrl
    }

    for (const [i, file] of queue.entries()) {
      try {
        const publicUrl = await uploadOne(file, i)

        let posterUrls = null
        if (file.type?.startsWith('video/')) {
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
            title: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
            description: '',
            imageUrls: [publicUrl],
            ...(posterUrls ? { posterUrls } : {}),
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
    if (bad) showError(t('fileImporterFailed', { count: bad }))
    if (ok) setQueue([])
  }

  return (
    <div className="card-glass" style={{ padding: 20 }}>
      <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>📂 {t('fileImporterTitle')}</h3>
      <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>
        {t('fileImporterHelp')}
      </p>

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
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
