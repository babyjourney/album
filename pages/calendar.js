// Calendar View (baseline — all tiers). Month grid highlighting days with
// posts; click a day to see that day's memories.
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch } from '../lib/pinAuth'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'
import FilteredPosts from '../components/journey/FilteredPosts'

const DOW = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']
const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

const key = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function CalendarView() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [counts, setCounts] = useState({})
  const [cursor, setCursor] = useState(null) // {y, m}
  const [selected, setSelected] = useState(null) // 'YYYY-MM-DD'

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
    const now = new Date()
    setCursor({ y: now.getFullYear(), m: now.getMonth() })
  }, [router])

  useEffect(() => {
    const run = async () => {
      if (!session?.familyId) return
      try {
        const res = await authenticatedFetch(`/api/photos/list?familyId=${session.familyId}&sort=oldest`)
        const data = await res.json()
        const map = {}
        if (res.ok && data.success) {
          for (const p of data.photos) {
            const d = new Date(p.created_at)
            const k = key(d.getFullYear(), d.getMonth(), d.getDate())
            map[k] = (map[k] || 0) + 1
          }
        }
        setCounts(map)
      } catch { setCounts({}) }
    }
    run()
  }, [session])

  const grid = useMemo(() => {
    if (!cursor) return []
    const first = new Date(cursor.y, cursor.m, 1)
    const startDow = (first.getDay() + 6) % 7 // Monday-first
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [cursor])

  if (!session || !cursor) return null

  const move = (delta) => {
    let m = cursor.m + delta, y = cursor.y
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setCursor({ y, m }); setSelected(null)
  }

  const dayStart = selected ? new Date(selected + 'T00:00:00').toISOString() : null
  const dayEnd = selected ? new Date(selected + 'T23:59:59.999').toISOString() : null

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock albumTitle={session.familyName} onSettings={() => setShowSettings(true)} onSignOut={() => { clearSession(); router.push('/login') }} />
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} onSignOut={() => { clearSession(); router.push('/login') }} />

      <div className="main-container" style={{ paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))', paddingBottom: 'max(120px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: '28px 0 16px' }}>
          <p className="text-eyebrow" style={{ color: 'var(--accent-iris)', marginBottom: 10 }}>🗓️ Calendar</p>
          <h1 className="text-display" style={{ marginBottom: 6 }}>Vedere calendar</h1>
        </div>

        <section className="card-glass" style={{ padding: 20, maxWidth: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={() => move(-1)} className="btn-icon" style={{ width: 36, height: 36 }}>‹</button>
            <strong style={{ fontSize: 16 }}>{MONTHS[cursor.m]} {cursor.y}</strong>
            <button onClick={() => move(1)} className="btn-icon" style={{ width: 36, height: 36 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {DOW.map((d) => <div key={d} className="text-subtle" style={{ textAlign: 'center', fontSize: 11, fontWeight: 600 }}>{d}</div>)}
            {grid.map((d, i) => {
              if (!d) return <div key={i} />
              const k = key(cursor.y, cursor.m, d)
              const count = counts[k] || 0
              const isSel = selected === k
              return (
                <button
                  key={i}
                  onClick={() => count && setSelected(isSel ? null : k)}
                  style={{
                    aspectRatio: '1/1', borderRadius: 10, fontSize: 13, cursor: count ? 'pointer' : 'default',
                    border: isSel ? '2px solid var(--accent-iris)' : '1px solid var(--glass-hairline)',
                    background: count ? (isSel ? 'rgba(124,58,237,0.18)' : 'var(--glass-1)') : 'transparent',
                    color: count ? 'var(--ink-1)' : 'var(--ink-2)', position: 'relative', fontWeight: count ? 600 : 400,
                  }}
                >
                  {d}
                  {count > 0 && <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-iris)' }} />}
                </button>
              )
            })}
          </div>
        </section>

        {selected && (
          <section className="card-glass" style={{ padding: 20, marginTop: 16 }}>
            <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>Postări din {selected}</h3>
            <FilteredPosts familyId={session.familyId} params={{ dateStart: dayStart, dateEnd: dayEnd, sort: 'oldest' }} />
          </section>
        )}
      </div>
    </div>
  )
}
