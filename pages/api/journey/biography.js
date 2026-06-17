// Child biography / life story — GET (read) + POST (upsert). Family tier.
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { getChildRecord, upsertChildRecord, resolveFamilyId, canWrite } from '../../../lib/childRecord'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      const row = await getChildRecord('child_biography', familyId, childId)
      return res.status(200).json({ success: true, biography: row })
    }
    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const childId = req.body?.childId || null
      const body = typeof req.body?.body === 'string' ? req.body.body : ''
      const row = await upsertChildRecord('child_biography', familyId, childId, { body })
      return res.status(200).json({ success: true, biography: row })
    }
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('biography api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(requireFeature('biography', handler))
