// Health record (vitals) — GET (read) + POST (upsert). Family tier.
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { getChildRecord, upsertChildRecord, resolveFamilyId, canWrite } from '../../../lib/childRecord'

const FIELDS = ['height_cm', 'weight_kg', 'blood_type', 'allergies', 'pediatrician', 'notes']

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      const row = await getChildRecord('health_records', familyId, childId)
      return res.status(200).json({ success: true, health: row })
    }
    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const childId = req.body?.childId || null
      const patch = {}
      for (const f of FIELDS) {
        if (req.body?.[f] !== undefined) {
          patch[f] = req.body[f] === '' ? null : req.body[f]
        }
      }
      const row = await upsertChildRecord('health_records', familyId, childId, patch)
      return res.status(200).json({ success: true, health: row })
    }
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('health api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(requireFeature('healthDashboard', handler))
