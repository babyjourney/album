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
  const [pkg, setPkg] = useState('starter')

  useEffect(() => {
    setPkg(normalizeTier(getFamilyPackage()))
  }, [])

  return {
    tier: pkg,
    tierInfo: getTier(pkg),
    limits: getTierLimits(pkg),
    has: (featureKey) => tierHasFeature(pkg, featureKey),
    requiredTier: (featureKey) => FEATURE_MIN_TIER[featureKey] || null,
    requiredTierLabel: (featureKey) => {
      const min = FEATURE_MIN_TIER[featureKey]
      return min ? TIERS[min].label : null
    },
  }
}
