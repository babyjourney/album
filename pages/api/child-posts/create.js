import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { photoId, childIds } = req.body

  if (!photoId || !Array.isArray(childIds) || childIds.length === 0) {
    return res.status(400).json({ error: 'ID-ul fotografiei și lista de copii sunt obligatorii' })
  }

  const familyId = req.auth.familyId

  try {
    // SECURITY: verify the photo belongs to the caller's family
    const { data: photo } = await supabase
      .from('photos')
      .select('id, family_id')
      .eq('id', photoId)
      .single()

    if (!photo || photo.family_id !== familyId) {
      return res.status(403).json({ error: 'Fotografia nu aparține familiei dvs.' })
    }

    // SECURITY: verify ALL provided childIds belong to the caller's family
    const { data: childRows, error: childErr } = await supabase
      .from('children')
      .select('id, family_id')
      .in('id', childIds)

    if (childErr) throw childErr
    if (!childRows || childRows.length !== childIds.length) {
      return res.status(400).json({ error: 'Unul sau mai mulți copii nu există' })
    }
    if (childRows.some(c => c.family_id !== familyId)) {
      return res.status(403).json({ error: 'Unul sau mai mulți copii nu aparțin familiei dvs.' })
    }

    // Create child-post associations
    const associations = childIds.map(childId => ({
      photo_id: photoId,
      child_id: childId
    }))

    const { data, error } = await supabase
      .from('child_posts')
      .insert(associations)
      .select()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      associations: data
    })

  } catch (error) {
    console.error('Child post association error:', error)
    return res.status(500).json({ error: `Asocierea cu copiii a eșuat: ${error.message}` })
  }
}

export default requireEditor(handler)
