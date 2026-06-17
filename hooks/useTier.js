// Client-side tier hook. Reads the family's tier from the signed session that
// pin-login stored (lib/pinAuth.js). The server is the source of truth — this
// is purely for UX (hiding/locking features, showing limits). All gated writes
// are ALSO enforced server-side via lib/requireFeature.js.

import { useState, useEffect } from 'react'
import { getFamilyPackage } from '../lib/pinAuth'
import {
  normalizeTier,
  getTier,
  getTierLimits,
  tierHasFeature,
  FEATURE_MIN_TIER,
  TIERS,
} from '../lib/tiers'

export function useTier() {
  // Default to starter for the SSR pass; sync from the session on mount.
  const [pkg, setPkg] = useState('starter')

  useEffect(() => {
    setPkg(normalizeTier(getFamilyPackage()))
  }, [])

  return {
    tier: pkg,                                   // normalized key: starter|family|legacy
    tierInfo: getTier(pkg),                      // { key, label, rank, blurb, limits }
    limits: getTierLimits(pkg),
    has: (featureKey) => tierHasFeature(pkg, featureKey),
    requiredTier: (featureKey) => FEATURE_MIN_TIER[featureKey] || null,
    requiredTierLabel: (featureKey) => {
      const min = FEATURE_MIN_TIER[featureKey]
      return min ? TIERS[min].label : null
    },
  }
}
