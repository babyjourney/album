// Client-side feature gate. Renders children when the family's tier unlocks the
// feature; otherwise renders a compact "🔒 Upgrade" lock card (or nothing, or a
// custom fallback). Enforcement is also done server-side — this is UX only.
//
// Usage:
//   <FeatureGate feature="healthDashboard"><HealthDashboard /></FeatureGate>
//   <FeatureGate feature="multipleChildren" mode="hide">…</FeatureGate>

import { useTier } from '../hooks/useTier'
import { useLanguage } from '../contexts/LanguageContext'

export default function FeatureGate({
  feature,
  children,
  mode = 'lock',      // 'lock' = show upgrade card, 'hide' = render nothing
  fallback = null,    // custom node to render when locked (overrides mode)
  title,              // optional label for the lock card
}) {
  const { has, requiredTierLabel } = useTier()
  const { t } = useLanguage()

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
        {title || t('featureLocked')}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
        {tierLabel
          ? t('featureAvailableInPlan', { tier: tierLabel })
          : t('featureNotInYourPlan')}
      </p>
    </div>
  )
}

// Small inline lock badge for buttons/menu items that should stay visible but
// disabled (e.g. "Add custom category 🔒").
export function LockBadge({ feature, style }) {
  const { has, requiredTierLabel } = useTier()
  const { t } = useLanguage()
  if (has(feature)) return null
  return (
    <span
      title={t('featureLockBadgeTitle', { tier: requiredTierLabel(feature) || t('tierHigher') })}
      style={{ fontSize: 12, opacity: 0.7, marginLeft: 6, ...style }}
    >
      🔒
    </span>
  )
}
