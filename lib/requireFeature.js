// Server-side feature gate (defense in depth — the client also hides locked
// features, but never trust the client).
//
// Wrap a handler that ALREADY runs inside requireAuth/requireEditor (so
// req.auth.familyId is set). It looks up the family's current tier and returns
// 403 if the tier doesn't include the requested feature.
//
// Usage:
//   import { requireEditor } from '../../../lib/authMiddleware'
//   import { requireFeature } from '../../../lib/requireFeature'
//   export default requireEditor(requireFeature('customCategories', handler))

import { supabase } from './supabaseClient'
import { tierHasFeature, FEATURE_MIN_TIER, TIERS } from './tiers'

export function requireFeature(featureKey, handler) {
  return async (req, res) => {
    const familyId =
      req.auth?.familyId ||
      (req.query && req.query.familyId) ||
      (req.body && req.body.familyId)

    // Admins bypass tier gates.
    if (req.auth?.isAdmin) {
      return handler(req, res)
    }

    if (!familyId) {
      return res.status(400).json({ error: 'familyId lipsește' })
    }

    const { data: fam, error } = await supabase
      .from('families')
      .select('package')
      .eq('id', familyId)
      .single()

    if (error) {
      console.error('[requireFeature] family lookup failed:', error)
      return res.status(500).json({ error: 'Nu s-a putut verifica planul' })
    }

    if (!tierHasFeature(fam?.package, featureKey)) {
      const minTier = FEATURE_MIN_TIER[featureKey]
      return res.status(403).json({
        error: `Această funcție necesită planul ${TIERS[minTier]?.label || minTier}.`,
        code: 'FEATURE_LOCKED',
        feature: featureKey,
        requiredTier: minTier,
      })
    }

    return handler(req, res)
  }
}

// Bare check (no HTTP) for handlers that need to branch on a feature inline.
export async function familyHasFeature(familyId, featureKey) {
  if (!familyId) return false
  const { data } = await supabase
    .from('families').select('package').eq('id', familyId).single()
  return tierHasFeature(data?.package, featureKey)
}
