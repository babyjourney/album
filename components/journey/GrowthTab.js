// Growth Tracking — height/weight entries over time + a "then vs now" photo
// comparison.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'

export default function GrowthTab({ familyId, childId }) {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ measuredOn: '', heightCm: '', weightKg: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [thenImg, setThenImg] = useState('')
  const [nowImg, setNowImg] = useState('')
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const { showSuccess, showError } = useToast()
  const canEdit = isEditor()

  const load = async () => {
    setLoaded(false)
    const qs = new URLSearchParams({ familyId })
    if (childId) qs.append('childId', childId)
    try {
      const res = await authenticatedFetch(`/api/journey/growth?${qs}`)
      const data = await res.json()
      setEntries(res.ok && data.success ? data.entries : [])
    } catch { setEntries([]) } finally { setLoaded(true) }
    // Load persisted then/now comparison photos.
    try {
      const cres = await authenticatedFetch(`/api/journey/growth-compare?${qs}`)
      const cdata = await cres.json()
      setThenImg(cdata?.compare?.then_url || '')
      setNowImg(cdata?.compare?.now_url || '')
    } catch { /* keep empty */ }
  }
  useEffect(() => { if (familyId) load() /* eslint-disable-next-line */ }, [familyId, childId])

  // Upload a chosen photo to storage and persist it as the then/now slot.
  const pickCompare = (slot) => async (ev) => {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploadingSlot(slot)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${familyId}/compare-${slot}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('album_uploads').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('album_uploads').getPublicUrl(path)
      const url = pub.publicUrl
      if (slot === 'then') setThenImg(url); else setNowImg(url)
      const res = await authenticatedFetch('/api/journey/growth-compare', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, [slot === 'then' ? 'thenUrl' : 'nowUrl']: url }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Eroare')
      showSuccess('Foto salvată')
    } catch (e) { showError(e.message) } finally { setUploadingSlot(null) }
  }

  const add = async () => {
    if (!form.measuredOn) { showError('Adaugă o dată'); return }
    setAdding(true)
    try {
      const res = await authenticatedFetch('/api/journey/growth', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Eroare')
      setForm({ measuredOn: '', heightCm: '', weightKg: '', note: '' })
      showSuccess('Înregistrare adăugată')
      load()
    } catch (e) { showError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    try {
      const res = await authenticatedFetch(`/api/journey/growth?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Eroare')
      setEntries((e) => e.filter((x) => x.id !== id))
    } catch (e) { showError(e.message) }
  }

  const maxH = Math.max(1, ...entries.map((e) => Number(e.height_cm) || 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Creștere</h3>

        {canEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16, alignItems: 'end' }}>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Data</label>
              <input type="date" value={form.measuredOn} onChange={(e) => setForm({ ...form, measuredOn: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Înălțime (cm)</label>
              <input type="number" step="any" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Greutate (kg)</label>
              <input type="number" step="any" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <button onClick={add} disabled={adding} className="btn-iris sheen" style={{ padding: '10px 16px', height: 42 }}>
              {adding ? '…' : '+ Adaugă'}
            </button>
          </div>
        )}

        {!loaded ? <div className="text-subtle">Se încarcă…</div> : entries.length === 0 ? (
          <div className="text-subtle">Nicio măsurătoare încă.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="nums text-subtle" style={{ width: 92, fontSize: 12 }}>{e.measured_on}</span>
                <div style={{ flex: 1, background: 'var(--glass-1)', borderRadius: 8, overflow: 'hidden', height: 22, position: 'relative' }}>
                  <div style={{ width: `${((Number(e.height_cm) || 0) / maxH) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }} />
                  <span style={{ position: 'absolute', left: 8, top: 2, fontSize: 12, color: 'var(--ink-1)' }}>
                    {e.height_cm ? `${e.height_cm} cm` : ''}{e.weight_kg ? ` · ${e.weight_kg} kg` : ''}
                  </span>
                </div>
                {canEdit && (
                  <button onClick={() => remove(e.id)} className="btn-icon" title="Șterge" style={{ width: 30, height: 30 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>Comparație foto — Atunci vs Acum</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{ slot: 'then', label: 'Atunci', img: thenImg }, { slot: 'now', label: 'Acum', img: nowImg }].map((c) => (
            <div key={c.slot} style={{ textAlign: 'center' }}>
              <div style={{ aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: 'var(--glass-1)', border: '1px solid var(--glass-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.img ? <img src={c.img} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="text-subtle" style={{ fontSize: 13 }}>{c.label}</span>}
              </div>
              {canEdit && (
                <input type="file" accept="image/*" disabled={uploadingSlot === c.slot} onChange={pickCompare(c.slot)} style={{ marginTop: 8, fontSize: 12 }} />
              )}
              {uploadingSlot === c.slot && <div className="text-subtle" style={{ fontSize: 11, marginTop: 4 }}>Se încarcă…</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
