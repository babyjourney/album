import { supabase } from './supabaseClient'
import { tierHasFeature, FEATURE_MIN_TIER, TIERS } from './tiers'

export function requireFeature(featureKey, handler) {
  return async (req, res) => {
    const familyId =
      req.auth?.familyId ||
      (req.query && req.query.familyId) ||
      (req.body && req.body.familyId)

    if (req.auth?.isAdmin) {
      return handler(req, res)
    }

    if (!familyId) {
      return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })
    }

    const { data: fam, error } = await supabase
      .from('families')
      .select('package')
      .eq('id', familyId)
      .single()

    if (error) {
      console.error('[requireFeature] family lookup failed:', error)
      return res.status(500).json({ error: 'Nu s-a putut verifica planul', errorKey: 'errPlanCheckFailed' })
    }

    if (!tierHasFeature(fam?.package, featureKey)) {
      const minTier = FEATURE_MIN_TIER[featureKey]
      return res.status(403).json({
        error: `Această funcție necesită planul ${TIERS[minTier]?.label || minTier}.`,
        errorKey: 'errFeatureLocked',
        code: 'FEATURE_LOCKED',
        feature: featureKey,
        requiredTier: minTier,
      })
    }

    return handler(req, res)
  }
}

export async function familyHasFeature(familyId, featureKey) {
  if (!familyId) return false
  const { data } = await supabase
    .from('families').select('package').eq('id', familyId).single()
  return tierHasFeature(data?.package, featureKey)
}
