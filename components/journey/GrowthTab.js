import { useState, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../../lib/supabaseClient'
import { authenticatedFetch, isEditor, getFamilyPackage } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { UPLOAD_IMAGE_ACCEPT, UPLOAD_FORMAT_LABELS, STORAGE_BUCKET, classifyUploadFile, fileExtension } from '../../lib/fileTypes'
import { getImageCompressionOptions, STORAGE_MAX_UPLOAD_MB, STORAGE_MAX_UPLOAD_BYTES } from '../../lib/packages'
import { convertImageToJpeg, canDecodeImage, withCanonicalType } from '../../lib/imageConvert'

const formatDay = (iso, locale) => {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  return y && m && d
    ? new Date(y, m - 1, d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : iso || ''
}

const formatNumber = (value, locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value))

const currentPackage = () => {
  try { return getFamilyPackage() } catch { return 'free' }
}

async function prepareCompareImage(file, info) {
  const options = getImageCompressionOptions(currentPackage())
  if (info.needsConversion) {
    try {
      return { file: await convertImageToJpeg(file, options) }
    } catch (err) {
      console.warn('Growth compare: image conversion failed for', file.name, err)
      return { rejected: 'conversion' }
    }
  }
  const source = withCanonicalType(file, info)
  if (info.isGif) {
    return (await canDecodeImage(source)) ? { file: source } : { rejected: 'unreadable' }
  }
  try {
    return { file: await imageCompression(source, { ...options, fileType: source.type }) }
  } catch (err) {
    console.warn('Growth compare: image compression failed for', file.name, err)
    return (await canDecodeImage(source)) ? { file: source } : { rejected: 'unreadable' }
  }
}

export default function GrowthTab({ familyId, childId }) {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ measuredOn: '', heightCm: '', weightKg: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [thenImg, setThenImg] = useState('')
  const [nowImg, setNowImg] = useState('')
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const { showSuccess, showError } = useToast()
  const { t, locale } = useLanguage()
  const canEdit = isEditor()

  const apiErrorText = (data) => (data?.errorKey ? t(data.errorKey) : data?.error) || t('errServerInternal')

  const load = async () => {
    setLoaded(false)
    const qs = new URLSearchParams({ familyId })
    if (childId) qs.append('childId', childId)
    try {
      const res = await authenticatedFetch(`/api/journey/growth?${qs}`)
      const data = await res.json()
      setEntries(res.ok && data.success ? data.entries : [])
    } catch { setEntries([]) } finally { setLoaded(true) }
    try {
      const cres = await authenticatedFetch(`/api/journey/growth-compare?${qs}`)
      const cdata = await cres.json()
      setThenImg(cdata?.compare?.then_url || '')
      setNowImg(cdata?.compare?.now_url || '')
    } catch {  }
  }
  useEffect(() => { if (familyId) load()  }, [familyId, childId])

  const pickCompare = (slot) => async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const info = classifyUploadFile(file)
    if (info?.kind !== 'image') {
      showError(t('growthCompareRejectedFormat', { name: file.name, images: UPLOAD_FORMAT_LABELS.images }))
      return
    }
    setUploadingSlot(slot)
    try {
      const prepared = await prepareCompareImage(file, info)
      if (prepared.rejected) {
        showError(t(prepared.rejected === 'conversion' ? 'uploadRejectedImageConversion' : 'uploadRejectedImageUnreadable', { names: file.name }))
        return
      }
      if (prepared.file.size > STORAGE_MAX_UPLOAD_BYTES) {
        showError(t('fileRejectedTooLargeForStorage', { count: 1, maxMB: STORAGE_MAX_UPLOAD_MB }))
        return
      }
      const ext = fileExtension(prepared.file.name) || classifyUploadFile(prepared.file)?.ext || '.jpg'
      const path = `${familyId}/compare-${slot}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, prepared.file, { upsert: false })
      if (upErr) { showError(t('uploadError')); return }
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      const url = pub.publicUrl
      const res = await authenticatedFetch('/api/journey/growth-compare', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, [slot === 'then' ? 'thenUrl' : 'nowUrl']: url }),
      })
      if (!res.ok) { showError(apiErrorText(await res.json().catch(() => ({})))); return }
      if (slot === 'then') setThenImg(url); else setNowImg(url)
      showSuccess(t('growthPhotoSaved'))
    } catch { showError(t('errServerInternal')) } finally { setUploadingSlot(null) }
  }

  const add = async () => {
    if (!form.measuredOn) { showError(t('growthDateRequired')); return }
    setAdding(true)
    try {
      const res = await authenticatedFetch('/api/journey/growth', {
        method: 'POST',
        body: JSON.stringify({ childId: childId || null, ...form }),
      })
      if (!res.ok) { showError(apiErrorText(await res.json().catch(() => ({})))); return }
      setForm({ measuredOn: '', heightCm: '', weightKg: '', note: '' })
      showSuccess(t('growthEntryAdded'))
      load()
    } catch { showError(t('errServerInternal')) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    try {
      const res = await authenticatedFetch(`/api/journey/growth?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { showError(apiErrorText(await res.json().catch(() => ({})))); return }
      setEntries((e) => e.filter((x) => x.id !== id))
    } catch { showError(t('errServerInternal')) }
  }

  const maxH = Math.max(1, ...entries.map((e) => Number(e.height_cm) || 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>{t('journeyTabGrowth')}</h3>

        {canEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16, alignItems: 'end' }}>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('date')}</label>
              <input type="date" value={form.measuredOn} onChange={(e) => setForm({ ...form, measuredOn: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('heightCmLabel')}</label>
              <input type="number" step="any" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('weightKgLabel')}</label>
              <input type="number" step="any" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} className="input-glass" style={{ width: '100%' }} />
            </div>
            <button onClick={add} disabled={adding} className="btn-iris sheen" style={{ padding: '10px 16px', height: 42 }}>
              {adding ? '…' : t('addPlus')}
            </button>
          </div>
        )}

        {!loaded ? <div className="text-subtle">{t('loading')}</div> : entries.length === 0 ? (
          <div className="text-subtle">{t('noMeasurementsYet')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="nums text-subtle" style={{ width: 92, fontSize: 12 }}>{formatDay(e.measured_on, locale)}</span>
                <div style={{ flex: 1, background: 'var(--glass-1)', borderRadius: 8, overflow: 'hidden', height: 22, position: 'relative' }}>
                  <div style={{ width: `${((Number(e.height_cm) || 0) / maxH) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }} />
                  <span style={{ position: 'absolute', left: 8, top: 2, fontSize: 12, color: 'var(--ink-1)' }}>
                    {e.height_cm ? `${formatNumber(e.height_cm, locale)} ${t('unitCm')}` : ''}{e.weight_kg ? ` · ${formatNumber(e.weight_kg, locale)} ${t('unitKg')}` : ''}
                  </span>
                </div>
                {canEdit && (
                  <button onClick={() => remove(e.id)} className="btn-icon" title={t('delete')} style={{ width: 30, height: 30 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-glass" style={{ padding: 20 }}>
        <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>{t('photoCompareTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{ slot: 'then', label: t('compareThen'), img: thenImg }, { slot: 'now', label: t('compareNow'), img: nowImg }].map((c) => (
            <div key={c.slot} style={{ textAlign: 'center' }}>
              <div style={{ aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: 'var(--glass-1)', border: '1px solid var(--glass-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.img ? <img src={c.img} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="text-subtle" style={{ fontSize: 13 }}>{c.label}</span>}
              </div>
              {canEdit && (
                <label className="btn-glass" style={{ display: 'inline-block', marginTop: 8, padding: '6px 12px', fontSize: 12, cursor: uploadingSlot === c.slot ? 'not-allowed' : 'pointer', opacity: uploadingSlot === c.slot ? 0.5 : 1 }}>
                  {t('uploadPhoto')}
                  <input type="file" accept={UPLOAD_IMAGE_ACCEPT} disabled={uploadingSlot === c.slot} onChange={pickCompare(c.slot)} style={{ display: 'none' }} />
                </label>
              )}
              {uploadingSlot === c.slot && <div className="text-subtle" style={{ fontSize: 11, marginTop: 4 }}>{t('uploading')}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
