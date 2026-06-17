// Biography & Life Story — a rich free-text page per child, plus a glance at
// recent posts the family can fold into the story.
import { useState, useEffect } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import FilteredPosts from './FilteredPosts'

export default function BiographyTab({ familyId, childId }) {
  const [body, setBody] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useToast()
  const canEdit = isEditor()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoaded(false)
      const qs = new URLSearchParams({ familyId })
      if (childId) qs.append('childId', childId)
      try {
        const res = await authenticatedFetch(`/api/journey/biography?${qs}`)
        const data = await res.json()
        if (!cancelled) { setBody(data?.biography?.body || ''); setLoaded(true) }
      } catch { if (!cancelled) setLoaded(true) }
    }
    if (familyId) load()
    return () => { cancelled = true }
  }, [familyId, childId])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/journey/biography', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, body }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Eroare')
      showSuccess('Biografie salvată')
    } catch (e) { showError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Biografie & Povestea Vieții</h3>
        {!loaded ? (
          <div className="text-subtle">Se încarcă…</div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!canEdit}
              rows={12}
              placeholder="Scrie povestea copilului — naștere, primii pași, momente importante…"
              className="input-glass"
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            />
            {canEdit && (
              <button onClick={save} disabled={saving} className="btn-iris sheen" style={{ marginTop: 12, padding: '10px 18px' }}>
                {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            )}
          </>
        )}
      </section>

      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>Postări recente</h3>
        <FilteredPosts familyId={familyId} childId={childId} params={{ sort: 'newest' }} />
      </section>
    </div>
  )
}
