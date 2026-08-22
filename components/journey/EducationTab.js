// Education & Life Chapters (item 11).
//
// Chapters used to be its own tab. Its event-entry UX was the good part — a
// dated, coloured segment that pulls in the posts belonging to it — so it was
// folded in here rather than kept as a separate tab the user had to remember.
//
// An entry now carries:
//   • a multi-line description (a <textarea>, so Enter / Shift+Enter both start
//     a new line — the old chapter form was a single-line <input>)
//   • its own hashtags, so posts sync into the entry by tag as well as by date
//     range. A christening two years after the "First year" chapter still shows
//     up under it if it's tagged.
import { useState, useEffect } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import FilteredPosts from './FilteredPosts'

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2']

const EMPTY_FORM = {
  title: '',
  description: '',
  hashtags: '',
  color: COLORS[0],
  startDate: '',
  endDate: '',
}

export default function EducationTab({ familyId, childId }) {
  // Narrative
  const [body, setBody] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Chapters / events
  const [chapters, setChapters] = useState([])
  const [chaptersLoaded, setChaptersLoaded] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
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

  const loadChapters = async () => {
    setChaptersLoaded(false)
    const qs = new URLSearchParams({ familyId })
    if (childId) qs.append('childId', childId)
    try {
      const res = await authenticatedFetch(`/api/journey/chapters?${qs}`)
      const data = await res.json()
      setChapters(res.ok && data.success ? data.chapters : [])
    } catch {
      setChapters([])
    } finally {
      setChaptersLoaded(true)
    }
  }
  useEffect(() => { if (familyId) loadChapters() /* eslint-disable-next-line */ }, [familyId, childId])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/journey/education', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, body }),
      })
      if (!res.ok) { const body = await res.json(); throw new Error((body.errorKey ? t(body.errorKey) : body.error) || t('error')) }
      showSuccess(t('educationSaved'))
    } catch (e) { showError(e.message) } finally { setSaving(false) }
  }

  const addChapter = async () => {
    if (!form.title.trim()) { showError(t('chapterTitleRequired')); return }
    setAdding(true)
    try {
      const res = await authenticatedFetch('/api/journey/chapters', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, ...form }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error((body.errorKey ? t(body.errorKey) : body.error) || t('error'))
      setForm(EMPTY_FORM)
      setShowForm(false)
      if (body.warning) showError(t(body.warning))
      else showSuccess(t('chapterAdded'))
      loadChapters()
    } catch (e) { showError(e.message) } finally { setAdding(false) }
  }

  const removeChapter = async (id) => {
    try {
      const res = await authenticatedFetch(`/api/journey/chapters?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('error'))
      setChapters((c) => c.filter((x) => x.id !== id))
    } catch (e) { showError(e.message) }
  }

  // Which posts belong to an entry: those inside its date range, PLUS anything
  // carrying one of its hashtags — matchMode 'any' makes the API OR the two
  // rather than intersect them, so a tagged post from outside the range still
  // shows up. An entry with neither is just a note.
  const paramsForChapter = (c) => {
    const params = { sort: 'oldest', matchMode: 'any' }
    if (c.start_date || c.end_date) {
      params.dateStart = c.start_date
        ? new Date(c.start_date + 'T00:00:00').toISOString()
        : '1970-01-01T00:00:00.000Z'
      params.dateEnd = c.end_date
        ? new Date(c.end_date + 'T23:59:59.999').toISOString()
        : new Date('2999-12-31T23:59:59.999Z').toISOString()
    }
    if (Array.isArray(c.hashtags) && c.hashtags.length) {
      params.hashtagsAny = c.hashtags.join(',')
    }
    return params
  }

  const hasFilter = (c) => c.start_date || c.end_date || (Array.isArray(c.hashtags) && c.hashtags.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>{t('educationTitle')}</h3>
        {!loaded ? <div className="text-subtle">{t('loading')}</div> : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!canEdit}
              rows={8}
              placeholder={t('educationPlaceholder')}
              className="input-glass"
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            />
            {canEdit && (
              <button onClick={save} disabled={saving} className="btn-iris sheen" style={{ marginTop: 12, padding: '10px 18px' }}>
                {saving ? t('saving') : t('save')}
              </button>
            )}
          </>
        )}
      </section>

      {/* Chapters / events — merged in from the old Capitole tab. */}
      <section className="card-glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h3 className="text-section-title" style={{ margin: 0, fontSize: 18 }}>{t('chaptersTitle')}</h3>
          {canEdit && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className={showForm ? 'btn-glass' : 'btn-iris sheen'}
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              {showForm ? t('cancel') : t('addPlus')}
            </button>
          )}
        </div>
        <p className="text-subtle" style={{ fontSize: 12, marginTop: 0, marginBottom: 16 }}>
          {t('chaptersHint')}
        </p>

        {canEdit && showForm && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 18,
            alignItems: 'end',
            padding: 14,
            borderRadius: 14,
            border: '1px solid var(--glass-hairline)',
            background: 'var(--glass-1)',
          }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('title')}</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-glass"
                style={{ width: '100%' }}
                placeholder={t('chapterTitlePlaceholder')}
              />
            </div>

            {/* A textarea, not an input — this is the field that needed to
                accept line breaks (item 11). */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-glass"
                rows={4}
                placeholder={t('chapterDescriptionPlaceholder')}
                style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('chapterHashtagsLabel')}</label>
              <input
                value={form.hashtags}
                onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                className="input-glass"
                style={{ width: '100%' }}
                placeholder={t('chapterHashtagsPlaceholder')}
              />
            </div>

            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('chapterFromLabel')}</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('chapterToLabel')}</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('chapterColorLabel')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      border: form.color === c ? '2px solid var(--ink-1)' : '1px solid var(--glass-hairline)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
            <button onClick={addChapter} disabled={adding} className="btn-iris sheen" style={{ padding: '10px 16px', height: 42 }}>
              {adding ? '…' : t('save')}
            </button>
          </div>
        )}

        {!chaptersLoaded ? (
          <div className="text-subtle">{t('loading')}</div>
        ) : chapters.length === 0 ? (
          <div className="text-subtle">{t('noChaptersYet')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {chapters.map((c) => (
              <div key={c.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--glass-hairline)' }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                  background: `${c.color || '#7c3aed'}22`,
                  borderLeft: `6px solid ${c.color || '#7c3aed'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{c.title}</div>
                    <div className="text-subtle nums" style={{ fontSize: 12 }}>
                      {c.start_date || '—'}{c.end_date ? ` → ${c.end_date}` : ''}
                    </div>
                    {c.description && (
                      // pre-wrap so the line breaks the author typed survive.
                      <p style={{
                        margin: '8px 0 0',
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: 'var(--ink-1)',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {c.description}
                      </p>
                    )}
                    {Array.isArray(c.hashtags) && c.hashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {c.hashtags.map((h) => (
                          <span key={h} className="glass-pill" style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            #{h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => removeChapter(c.id)} className="btn-icon" title={t('delete')} style={{ width: 30, height: 30, flexShrink: 0 }}>
                      ✕
                    </button>
                  )}
                </div>

                {hasFilter(c) && (
                  <div style={{ padding: 14 }}>
                    <FilteredPosts
                      familyId={familyId}
                      childId={childId}
                      params={paramsForChapter(c)}
                      emptyText={t('noPostsInChapter')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>{t('diplomasTitle')}</h3>
        <p className="text-subtle" style={{ fontSize: 12, marginTop: 0 }}>
          {t('diplomasHint')}
        </p>
        <FilteredPosts
          familyId={familyId}
          childId={childId}
          params={{ categoryAny: 'education,learning', hashtagsAny: 'diploma,certificate,certificat,proiect,project,scoala,school,education' }}
          emptyText={t('noDiplomasYet')}
        />
      </section>
    </div>
  )
}
