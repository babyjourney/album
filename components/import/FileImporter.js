// Dependency-free importer: select many files (or a whole folder — e.g. an
// extracted Google Takeout / Instagram export) and bring them into the album.
// Each file is uploaded to storage and becomes its own post via the existing
// /api/posts/create-multi endpoint. No OAuth, no zip library required.
import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { authenticatedFetch } from '../../lib/pinAuth'
import { isAcceptedUploadFile } from '../../lib/fileTypes'
import { useToast } from '../../contexts/ToastContext'

export default function FileImporter({ familyId }) {
  const inputRef = useRef(null)
  const folderRef = useRef(null)
  const [queue, setQueue] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const { showSuccess, showError } = useToast()

  const pick = (files) => {
    const accepted = Array.from(files || []).filter(isAcceptedUploadFile)
    const rejected = (files?.length || 0) - accepted.length
    if (rejected > 0) showError(`${rejected} fișier(e) ignorate (tip neacceptat).`)
    setQueue(accepted)
    setDone(0); setFailed(0)
  }

  const run = async () => {
    if (!queue.length) return
    setRunning(true); setDone(0); setFailed(0)
    let ok = 0, bad = 0
    for (const [i, file] of queue.entries()) {
      try {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
        const path = `${familyId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('album_uploads').upload(path, file)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('album_uploads').getPublicUrl(path)

        const res = await authenticatedFetch('/api/posts/create-multi', {
          method: 'POST',
          body: JSON.stringify({
            title: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
            description: '',
            imageUrls: [pub.publicUrl],
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
    if (ok) showSuccess(`${ok} element(e) importate.`)
    if (bad) showError(`${bad} element(e) au eșuat.`)
    if (ok) setQueue([])
  }

  return (
    <div className="card-glass" style={{ padding: 20 }}>
      <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>📂 Încarcă fișiere sau folder</h3>
      <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>
        Selectează poze, video, audio sau documente. Pentru arhive (Google Takeout,
        export Instagram), dezarhivează-le întâi și alege folderul.
      </p>

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files)} />
      {/* webkitdirectory enables folder selection in Chromium/Safari */}
      <input ref={folderRef} type="file" multiple webkitdirectory="" directory="" style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files)} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => inputRef.current?.click()} disabled={running} className="btn-glass" style={{ padding: '9px 16px' }}>
          Alege fișiere
        </button>
        <button onClick={() => folderRef.current?.click()} disabled={running} className="btn-glass" style={{ padding: '9px 16px' }}>
          Alege folder
        </button>
      </div>

      {queue.length > 0 && (
        <div className="glass-soft" style={{ padding: 14, borderRadius: 12 }}>
          <div style={{ marginBottom: 10, fontSize: 14 }}>
            {queue.length} fișier(e) în coadă{running ? ` · ${done}/${queue.length} importate` : ''}
            {failed > 0 ? ` · ${failed} eșuate` : ''}
          </div>
          <button onClick={run} disabled={running} className="btn-iris sheen" style={{ padding: '10px 18px' }}>
            {running ? 'Se importă…' : `Importă ${queue.length} element(e)`}
          </button>
        </div>
      )}
    </div>
  )
}
