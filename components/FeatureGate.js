// Client-side feature gate. Renders children when the family's tier unlocks the
// feature; otherwise renders a compact "🔒 Upgrade" lock card (or nothing, or a
// custom fallback). Enforcement is also done server-side — this is UX only.
//
// Usage:
//   <FeatureGate feature="healthDashboard"><HealthDashboard /></FeatureGate>
//   <FeatureGate feature="multipleChildren" mode="hide">…</FeatureGate>

import { useTier } from '../hooks/useTier'

export default function FeatureGate({
  feature,
  children,
  mode = 'lock',      // 'lock' = show upgrade card, 'hide' = render nothing
  fallback = null,    // custom node to render when locked (overrides mode)
  title,              // optional label for the lock card
}) {
  const { has, requiredTierLabel } = useTier()

  if (has(feature)) return children
  if (fallback !== null) return fallback
  if (mode === 'hide') return null

  const tierLabel = requiredTierLabel(feature)

  return (
    <div
      className="glass-soft"
      style={{
        padding: '24px',
        borderRadius: '16px',
        textAlign: 'center',
        maxWidth: 420,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
      <h3 className="text-section-title" style={{ fontSize: 17, marginBottom: 8 }}>
        {title || 'Funcție blocată'}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
        {tierLabel
          ? `Această funcție este disponibilă în planul ${tierLabel}.`
          : 'Această funcție nu este disponibilă în planul tău.'}
      </p>
    </div>
  )
}

// Small inline lock badge for buttons/menu items that should stay visible but
// disabled (e.g. "Add custom category 🔒").
export function LockBadge({ feature, style }) {
  const { has, requiredTierLabel } = useTier()
  if (has(feature)) return null
  return (
    <span
      title={`Disponibil în planul ${requiredTierLabel(feature) || 'superior'}`}
      style={{ fontSize: 12, opacity: 0.7, marginLeft: 6, ...style }}
    >
      🔒
    </span>
  )
}
