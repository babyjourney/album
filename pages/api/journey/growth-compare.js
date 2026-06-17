// Growth "then vs now" photo comparison — GET (read) + POST (upsert two URLs).
// Family tier (part of Growth Tracking).
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { getChildRecord, upsertChildRecord, resolveFamilyId, canWrite } from '../../../lib/childRecord'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      const row = await getChildRecord('growth_compare', familyId, childId)
      return res.status(200).json({ success: true, compare: row })
    }
    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const childId = req.body?.childId || null
      const patch = {}
      if (req.body?.thenUrl !== undefined) patch.then_url = req.body.thenUrl || null
      if (req.body?.nowUrl !== undefined) patch.now_url = req.body.nowUrl || null
      const row = await upsertChildRecord('growth_compare', familyId, childId, patch)
      return res.status(200).json({ success: true, compare: row })
    }
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('growth-compare api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(requireFeature('growthTracking', handler))
