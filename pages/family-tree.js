import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch, isEditor } from '../lib/pinAuth'
import { useChildren } from '../lib/useChildren'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useTier } from '../hooks/useTier'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'

// The `value` is what gets stored on the node row, so it stays the Romanian
// canonical string that existing rows already carry — only the label shown to
// the user is translated. relationLabelFor() falls back to the raw stored value
// for anything not in this list.
const RELATIONS = [
  { value: 'Mamă', key: 'relationMother' },
  { value: 'Tată', key: 'relationFather' },
  { value: 'Bunic', key: 'relationGrandfather' },
  { value: 'Bunică', key: 'relationGrandmother' },
  { value: 'Frate', key: 'relationBrother' },
  { value: 'Soră', key: 'relationSister' },
  { value: 'Unchi', key: 'relationUncle' },
  { value: 'Mătușă', key: 'relationAunt' },
  { value: 'Văr/Vară', key: 'relationCousin' },
  { value: 'Altul', key: 'relationOther' },
]

export default function FamilyTree() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [nodes, setNodes] = useState([])
  const [nodesLoaded, setNodesLoaded] = useState(false)
  const [form, setForm] = useState({ name: '', relation: RELATIONS[0].value, birthYear: '', notes: '' })
  const [adding, setAdding] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const { children, isMultiChild } = useChildren(session?.familyId)
  const { showSuccess, showError } = useToast()
  const { limits, requiredTierLabel } = useTier()
  const canEdit = isEditor()
  const cap = limits.familyTreeMaxNodes
  const atCap = Number.isFinite(cap) && nodes.length >= cap

  const relationLabelFor = (value) => {
    const known = RELATIONS.find((r) => r.value === value)
    return known ? t(known.key) : value
  }

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
    setLoading(false)
  }, [router])

  const loadNodes = async (familyId) => {
    setNodesLoaded(false)
    try {
      const res = await authenticatedFetch(`/api/family-tree/nodes?familyId=${familyId}`)
      const data = await res.json()
      setNodes(res.ok && data.success ? data.nodes : [])
    } catch { setNodes([]) } finally { setNodesLoaded(true) }
  }
  useEffect(() => { if (session?.familyId) loadNodes(session.familyId) }, [session])

  const add = async () => {
    if (!form.name.trim()) { showError(t('familyTreeNameRequired')); return }
    setAdding(true)
    try {
      const res = await authenticatedFetch('/api/family-tree/nodes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, relation: form.relation,
          birthYear: form.birthYear ? parseInt(form.birthYear) : null,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data.errorKey ? t(data.errorKey) : data.error) || t('error'))
      setForm({ name: '', relation: RELATIONS[0].value, birthYear: '', notes: '' })
      showSuccess(t('familyTreeMemberAdded'))
      loadNodes(session.familyId)
    } catch (e) { showError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    try {
      const res = await authenticatedFetch(`/api/family-tree/nodes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('error'))
      setNodes((n) => n.filter((x) => x.id !== id))
    } catch (e) { showError(e.message) }
  }

  if (loading || !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--glass-hairline)', borderTopColor: 'var(--accent-iris)', animation: 'spin 0.9s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        albumTitle={session.familyName}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => { clearSession(); router.push('/login') }}
        children={isMultiChild ? children : []}
        selectedChildId={selectedChildId}
        onSelectChild={isMultiChild ? setSelectedChildId : undefined}
      />

      <main style={{
        position: 'relative', zIndex: 1,
        paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(120px, env(safe-area-inset-bottom))',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <header style={{ marginBottom: 24 }}>
          <p className="text-eyebrow" style={{ color: 'var(--accent-iris)', marginBottom: 10 }}>
            {t('familyTreeTitle')}
          </p>
          <h1 className="text-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginBottom: 8 }}>
            {t('familyTreeTitle')}
          </h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>
            {Number.isFinite(cap)
              ? t('familyTreeBasicCount', { count: nodes.length, cap, tier: requiredTierLabel('extendedFamilyTree') })
              : t('familyTreeExtendedCount', { count: nodes.length })}
          </p>
        </header>

        {canEdit && (
          <div className="card-glass" style={{ padding: 20, marginBottom: 20 }}>
            {atCap ? (
              <div className="glass-soft" style={{ padding: 16, textAlign: 'center', borderRadius: 12 }}>
                {t('familyTreeCapReached', { cap, tier: requiredTierLabel('extendedFamilyTree') })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
                <div>
                  <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('nameLabel')}</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-glass" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('relationLabel')}</label>
                  <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className="input-glass" style={{ width: '100%' }}>
                    {RELATIONS.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('birthYearLabel')}</label>
                  <input type="number" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} className="input-glass" style={{ width: '100%' }} />
                </div>
                <button onClick={add} disabled={adding} className="btn-iris sheen" style={{ padding: '10px 16px', height: 42 }}>
                  {adding ? '…' : t('addPlus')}
                </button>
              </div>
            )}
          </div>
        )}

        {!nodesLoaded ? (
          <div className="text-subtle" style={{ padding: 24, textAlign: 'center' }}>{t('loading')}</div>
        ) : nodes.length === 0 ? (
          <div className="card-glass" style={{ padding: 40, textAlign: 'center' }}>
            <div className="text-subtle">{t('noFamilyMembersYet')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {nodes.map((n) => (
              <div key={n.id} className="card-glass" style={{ padding: 16, position: 'relative' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', marginBottom: 10,
                  background: 'linear-gradient(135deg, #fb923c, #c2410c)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18,
                }}>
                  {(n.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{n.name}</div>
                <div className="text-subtle" style={{ fontSize: 12 }}>
                  {n.relation ? relationLabelFor(n.relation) : '—'}{n.birth_year ? ` · ${n.birth_year}` : ''}
                </div>
                {n.notes && <p className="text-subtle" style={{ fontSize: 12, marginTop: 8 }}>{n.notes}</p>}
                {canEdit && (
                  <button onClick={() => remove(n.id)} className="btn-icon" title={t('delete')}
                    style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={() => { clearSession(); router.push('/login') }}
      />
    </div>
  )
}
