// Educational Progress — a narrative plus posts tagged as diplomas /
// certificates / projects pulled in from the timeline.
import { useState, useEffect } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import FilteredPosts from './FilteredPosts'

export default function EducationTab({ familyId, childId }) {
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
        const res = await authenticatedFetch(`/api/journey/education?${qs}`)
        const data = await res.json()
        if (!cancelled) { setBody(data?.education?.body || ''); setLoaded(true) }
      } catch { if (!cancelled) setLoaded(true) }
    }
    if (familyId) load()
    return () => { cancelled = true }
  }, [familyId, childId])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/journey/education', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, body }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Eroare')
      showSuccess('Salvat')
    } catch (e) { showError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Progres Educațional</h3>
        {!loaded ? <div className="text-subtle">Se încarcă…</div> : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!canEdit}
              rows={8}
              placeholder="Unde și ce a studiat, etape școlare, realizări…"
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
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>Diplome, certificate & proiecte</h3>
        <p className="text-subtle" style={{ fontSize: 12, marginTop: 0 }}>
          Postări etichetate cu #diploma #certificate #proiect #scoala sau din categoria Învățare.
        </p>
        <FilteredPosts
          familyId={familyId}
          childId={childId}
          params={{ categoryAny: 'learning,education', hashtagsAny: 'diploma,certificate,certificat,proiect,project,scoala,school,education' }}
          emptyText="Nicio diplomă/proiect etichetat încă."
        />
      </section>
    </div>
  )
}
