// Life Chapters — colored, dated segments of the timeline.
import { useState, useEffect } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import FilteredPosts from './FilteredPosts'

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2']

export default function ChaptersTab({ familyId, childId }) {
  const [chapters, setChapters] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ title: '', color: COLORS[0], startDate: '', endDate: '' })
  const [adding, setAdding] = useState(false)
  const { showSuccess, showError } = useToast()
  const canEdit = isEditor()

  const load = async () => {
    setLoaded(false)
    const qs = new URLSearchParams({ familyId })
    if (childId) qs.append('childId', childId)
    try {
      const res = await authenticatedFetch(`/api/journey/chapters?${qs}`)
      const data = await res.json()
      setChapters(res.ok && data.success ? data.chapters : [])
    } catch { setChapters([]) } finally { setLoaded(true) }
  }
  useEffect(() => { if (familyId) load() /* eslint-disable-next-line */ }, [familyId, childId])

  const add = async () => {
    if (!form.title.trim()) { showError('Adaugă un titlu'); return }
    setAdding(true)
    try {
      const res = await authenticatedFetch('/api/journey/chapters', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Eroare')
      setForm({ title: '', color: COLORS[0], startDate: '', endDate: '' })
      showSuccess('Capitol adăugat')
      load()
    } catch (e) { showError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    try {
      const res = await authenticatedFetch(`/api/journey/chapters?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Eroare')
      setChapters((c) => c.filter((x) => x.id !== id))
    } catch (e) { showError(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Capitolele Vieții</h3>

        {canEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16, alignItems: 'end' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Titlu capitol</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-glass" style={{ width: '100%' }} placeholder="ex. Primul an, Grădinița…" />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>De la</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Până la</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Culoare</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--ink-1)' : '1px solid var(--glass-hairline)', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <button onClick={add} disabled={adding} className="btn-iris sheen" style={{ padding: '10px 16px', height: 42 }}>
              {adding ? '…' : '+ Adaugă'}
            </button>
          </div>
        )}

        {!loaded ? <div className="text-subtle">Se încarcă…</div> : chapters.length === 0 ? (
          <div className="text-subtle">Niciun capitol încă.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {chapters.map((c) => (
              <div key={c.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--glass-hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: `${c.color || '#7c3aed'}22`, borderLeft: `6px solid ${c.color || '#7c3aed'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{c.title}</div>
                    <div className="text-subtle nums" style={{ fontSize: 12 }}>
                      {c.start_date || '—'}{c.end_date ? ` → ${c.end_date}` : ''}
                    </div>
                  </div>
                  {canEdit && <button onClick={() => remove(c.id)} className="btn-icon" title="Șterge" style={{ width: 30, height: 30 }}>✕</button>}
                </div>
                {/* Posts that fall inside this chapter's date range — the timeline,
                    divided by chapter. */}
                {(c.start_date || c.end_date) && (
                  <div style={{ padding: 14 }}>
                    <FilteredPosts
                      familyId={familyId}
                      childId={childId}
                      params={{
                        sort: 'oldest',
                        dateStart: c.start_date ? new Date(c.start_date + 'T00:00:00').toISOString() : '1970-01-01T00:00:00.000Z',
                        dateEnd: c.end_date ? new Date(c.end_date + 'T23:59:59.999').toISOString() : new Date('2999-12-31T23:59:59.999Z').toISOString(),
                      }}
                      emptyText="Nicio postare în acest capitol."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
