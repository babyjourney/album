import { useState, useEffect } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import FilteredPosts from './FilteredPosts'

const FIELDS = [
  { key: 'height_cm', labelKey: 'heightCmLabel', type: 'number' },
  { key: 'weight_kg', labelKey: 'weightKgLabel', type: 'number' },
  { key: 'blood_type', labelKey: 'bloodTypeLabel', type: 'text' },
  { key: 'allergies', labelKey: 'allergiesLabel', type: 'text' },
  { key: 'pediatrician', labelKey: 'pediatricianLabel', type: 'text' },
]

export default function HealthTab({ familyId, childId }) {
  const [rec, setRec] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const canEdit = isEditor()

  const apiErrorText = (data) => (data?.errorKey ? t(data.errorKey) : data?.error) || t('errServerInternal')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoaded(false)
      const qs = new URLSearchParams({ familyId })
      if (childId) qs.append('childId', childId)
      try {
        const res = await authenticatedFetch(`/api/journey/health?${qs}`)
        const data = await res.json()
        if (!cancelled) { setRec(data?.health || {}); setLoaded(true) }
      } catch { if (!cancelled) setLoaded(true) }
    }
    if (familyId) load()
    return () => { cancelled = true }
  }, [familyId, childId])

  const setField = (k, v) => setRec((r) => ({ ...r, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { childId: childId || null, notes: rec.notes || '' }
      FIELDS.forEach((f) => { payload[f.key] = rec[f.key] ?? '' })
      const res = await authenticatedFetch('/api/journey/health', {
        method: 'POST', body: JSON.stringify(payload),
      })
      if (!res.ok) { showError(apiErrorText(await res.json().catch(() => ({})))); return }
      showSuccess(t('healthSaved'))
    } catch { showError(t('errServerInternal')) } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>{t('healthTitle')}</h3>
        {!loaded ? <div className="text-subtle">{t('loading')}</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t(f.labelKey)}</label>
                  <input
                    type={f.type}
                    step={f.type === 'number' ? 'any' : undefined}
                    value={rec[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    disabled={!canEdit}
                    className="input-glass"
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('notesLabel')}</label>
              <textarea
                value={rec.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="input-glass"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            {canEdit && (
              <button onClick={save} disabled={saving} className="btn-iris sheen" style={{ marginTop: 14, padding: '10px 18px' }}>
                {saving ? t('saving') : t('save')}
              </button>
            )}
          </>
        )}
      </section>

      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>{t('healthPostsTitle')}</h3>
        <p className="text-subtle" style={{ fontSize: 12, marginTop: 0 }}>
          {t('healthPostsHint')}
        </p>
        <FilteredPosts
          familyId={familyId}
          childId={childId}
          params={{ categoryAny: 'health,sanatate', hashtagsAny: 'health,sanatate,sănătate,medicine,medicina,medicină,medical,doctor,vaccine,vaccin,здоровье,медицина,врач,прививка,вакцина' }}
          emptyText={t('noHealthPostsYet')}
        />
      </section>
    </div>
  )
}
