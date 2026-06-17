// Family tree nodes — GET list, POST create, PUT update, DELETE.
// The BASIC tree is available to every tier but capped at the tier's
// familyTreeMaxNodes (Starter = 20). The EXTENDED (unlimited) tree is Family+.
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { resolveFamilyId, canWrite } from '../../../lib/childRecord'
import { getTierLimits, TIERS, FEATURE_MIN_TIER } from '../../../lib/tiers'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('family_tree_nodes').select('*').eq('family_id', familyId)
        .order('display_order', { ascending: true })
      if (error) throw error
      return res.status(200).json({ success: true, nodes: data || [] })
    }

    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const { name, relation, parentId, photoUrl, birthYear, notes, displayOrder } = req.body || {}
      if (!name || !name.trim()) return res.status(400).json({ error: 'Numele este obligatoriu' })

      // Enforce the tier node cap (basic tree). Admins bypass.
      if (!req.auth.isAdmin) {
        const { data: fam } = await supabase
          .from('families').select('package').eq('id', familyId).single()
        const cap = getTierLimits(fam?.package).familyTreeMaxNodes
        if (Number.isFinite(cap)) {
          const { count } = await supabase
            .from('family_tree_nodes')
            .select('id', { count: 'exact', head: true })
            .eq('family_id', familyId)
          if ((count || 0) >= cap) {
            const min = FEATURE_MIN_TIER.extendedFamilyTree
            return res.status(403).json({
              error: `Arborele de bază este limitat la ${cap} persoane. Treci la planul ${TIERS[min]?.label} pentru arbore extins.`,
              code: 'FEATURE_LOCKED',
              feature: 'extendedFamilyTree',
              requiredTier: min,
            })
          }
        }
      }

      const { data, error } = await supabase
        .from('family_tree_nodes')
        .insert({
          family_id: familyId,
          name: name.trim(),
          relation: relation || null,
          parent_id: parentId || null,
          photo_url: photoUrl || null,
          birth_year: birthYear || null,
          notes: notes || null,
          display_order: displayOrder || 0,
        })
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ success: true, node: data })
    }

    if (req.method === 'PUT') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const { id, name, relation, parentId, photoUrl, birthYear, notes, displayOrder } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id lipsește' })
      const patch = {}
      if (name !== undefined) patch.name = name
      if (relation !== undefined) patch.relation = relation
      if (parentId !== undefined) patch.parent_id = parentId || null
      if (photoUrl !== undefined) patch.photo_url = photoUrl || null
      if (birthYear !== undefined) patch.birth_year = birthYear || null
      if (notes !== undefined) patch.notes = notes || null
      if (displayOrder !== undefined) patch.display_order = displayOrder
      const { data, error } = await supabase
        .from('family_tree_nodes').update(patch).eq('id', id).eq('family_id', familyId)
        .select().single()
      if (error) throw error
      return res.status(200).json({ success: true, node: data })
    }

    if (req.method === 'DELETE') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'id lipsește' })
      const { error } = await supabase
        .from('family_tree_nodes').delete().eq('id', id).eq('family_id', familyId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('family-tree nodes api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(handler)
