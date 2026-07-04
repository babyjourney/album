// Right-side vertical timeline navigation (desktop only). Builds a year -> month
// index from the loaded posts and scrolls the feed to the first post of the
// chosen period (BentoMasonry gives each card id="post-<id>").
import { useEffect, useMemo, useState } from 'react'

const MONTHS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']

export default function TimelineNav({ posts = [] }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [openYear, setOpenYear] = useState(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1180)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Group posts (already sorted newest-first from the feed) into
  // years -> months, remembering the first post id of each bucket.
  const groups = useMemo(() => {
    const byYear = new Map()
    for (const p of posts) {
      if (!p?.created_at) continue
      const d = new Date(p.created_at)
      if (isNaN(d)) continue
      const y = d.getFullYear()
      const m = d.getMonth()
      if (!byYear.has(y)) byYear.set(y, { year: y, firstId: p.id, months: new Map() })
      const yr = byYear.get(y)
      if (!yr.months.has(m)) yr.months.set(m, { month: m, firstId: p.id })
    }
    return Array.from(byYear.values())
      .sort((a, b) => b.year - a.year)
      .map((y) => ({ ...y, months: Array.from(y.months.values()).sort((a, b) => b.month - a.month) }))
  }, [posts])

  useEffect(() => {
    if (openYear === null && groups.length) setOpenYear(groups[0].year)
  }, [groups, openYear])

  if (!isDesktop || groups.length === 0) return null

  const scrollTo = (id) => {
    const el = typeof document !== 'undefined' && document.getElementById(`post-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Cronologie"
      style={{
        position: 'fixed',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        zIndex: 60,
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: 10,
        borderRadius: 18,
        background: 'var(--glass-3)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--glass-hairline-strong)',
        boxShadow: '0 18px 50px -16px rgba(15,15,30,0.30), inset 0 1px 0 0 var(--glass-hairline-strong)',
        minWidth: 76,
      }}
    >
      {groups.map((y) => {
        const active = openYear === y.year
        return (
          <div key={y.year} style={{ marginBottom: 4 }}>
            <button
              onClick={() => { setOpenYear(active ? null : y.year); scrollTo(y.firstId) }}
              className="nums"
              style={{
                width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                color: active ? 'var(--accent-iris)' : 'var(--ink-1)',
                background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
              }}
            >
              {y.year}
            </button>
            {active && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 6, marginTop: 2 }}>
                {y.months.map((m) => (
                  <button
                    key={m.month}
                    onClick={() => scrollTo(m.firstId)}
                    style={{
                      textAlign: 'left', padding: '4px 10px', borderRadius: 8,
                      fontSize: 12, cursor: 'pointer', border: 'none',
                      background: 'transparent', color: 'var(--ink-2)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-1)'; e.currentTarget.style.color = 'var(--ink-1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)' }}
                  >
                    {MONTHS_RO[m.month]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
