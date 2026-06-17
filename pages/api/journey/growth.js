// Growth entries (height/weight over time) — GET list, POST create, DELETE.
// Family tier.
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId, canWrite } from '../../../lib/childRecord'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      let q = supabase.from('growth_entries').select('*').eq('family_id', familyId)
      q = childId ? q.eq('child_id', childId) : q.is('child_id', null)
      const { data, error } = await q.order('measured_on', { ascending: true })
      if (error) throw error
      return res.status(200).json({ success: true, entries: data || [] })
    }

    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const { childId, measuredOn, heightCm, weightKg, note } = req.body || {}
      if (!measuredOn) return res.status(400).json({ error: 'Data măsurării este obligatorie' })
      const { data, error } = await supabase
        .from('growth_entries')
        .insert({
          family_id: familyId,
          child_id: childId || null,
          measured_on: measuredOn,
          height_cm: heightCm === '' || heightCm === undefined ? null : heightCm,
          weight_kg: weightKg === '' || weightKg === undefined ? null : weightKg,
          note: note || null,
        })
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ success: true, entry: data })
    }

    if (req.method === 'DELETE') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'id lipsește' })
      // Scope delete to this family so a foreign id can't be removed.
      const { error } = await supabase
        .from('growth_entries').delete().eq('id', id).eq('family_id', familyId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('growth api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(requireFeature('growthTracking', handler))
