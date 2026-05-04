import { useState } from 'react'

// Single glass pill at bottom-right containing all action icons.
// Each item: { icon, label, onClick, tone? ('iris'|'aqua'|'peach'|'mint'|'amber') }
// The tone colors only the icon stroke — the orb itself is unified glass.
export default function ActionCluster({ items = [] }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 'max(20px, env(safe-area-inset-right))',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        zIndex: 70,
        display: 'flex',
        gap: 4,
        padding: 6,
        background: 'var(--glass-3)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid var(--glass-hairline-strong)',
        borderRadius: 999,
        boxShadow:
          '0 18px 50px -16px rgba(15,15,30,0.30),' +
          ' inset 0 1px 0 0 var(--glass-hairline-strong)',
      }}
    >
      {items.map((it, i) => (
        <ActionButton key={i} {...it} />
      ))}
    </div>
  )
}

const TONE_INK = {
  iris:  '#7c3aed',
  aqua:  '#06b6d4',
  peach: '#fb7185',
  mint:  '#10b981',
  amber: '#f59e0b',
  glass: 'var(--ink-1)',
}

function ActionButton({ icon, label, onClick, tone = 'iris', primary = false }) {
  const [hovered, setHovered] = useState(false)
  const ink = TONE_INK[tone] || TONE_INK.iris

  // Primary action gets a tinted bg + matching glow on hover.
  // Secondary actions are neutral and only color the icon.
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: 48, height: 48,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: primary
          ? `linear-gradient(135deg, ${tone === 'iris' ? '#a78bfa' : tone === 'aqua' ? '#38bdf8' : '#fda4af'}, ${tone === 'iris' ? '#6d28d9' : tone === 'aqua' ? '#0e7490' : '#be185d'})`
          : (hovered ? 'var(--glass-1)' : 'transparent'),
        color: primary ? '#fff' : ink,
        border: primary ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)',
        boxShadow: primary
          ? `inset 0 1px 0 0 rgba(255,255,255,0.30), 0 6px 18px -6px ${ink}88`
          : 'none',
      }}
    >
      {icon}
    </button>
  )
}
