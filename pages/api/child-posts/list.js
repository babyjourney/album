import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function listFamilyLinks(req, res) {
  const familyId = req.auth.isAdmin ? req.query.familyId : req.auth.familyId
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })

  try {
    const { data: photos, error: photosErr } = await supabase
      .from('photos').select('id').eq('family_id', familyId)
    if (photosErr) throw photosErr

    const photoIds = (photos || []).map((p) => p.id)
    if (photoIds.length === 0) return res.status(200).json({ success: true, links: [] })

    const { data, error } = await supabase
      .from('child_posts').select('photo_id, child_id').in('photo_id', photoIds)
    if (error) throw error

    return res.status(200).json({ success: true, links: data || [] })
  } catch (error) {
    console.error('child-posts family list error:', error)
    return res.status(500).json({ error: 'Încărcarea asocierilor a eșuat', errorKey: 'errServerInternal' })
  }
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda nu este permisă' })

  const photoId = req.query.photoId
  if (!photoId) return listFamilyLinks(req, res)

  try {
    const { data: photo } = await supabase
      .from('photos').select('id, family_id').eq('id', photoId).single()
    if (!photo) return res.status(404).json({ error: 'Postarea nu a fost găsită', errorKey: 'errPostNotFound' })
    if (!req.auth.isAdmin && photo.family_id !== req.auth.familyId) {
      return res.status(403).json({ error: 'Fotografia nu aparține familiei dvs.', errorKey: 'errForbiddenOtherFamily' })
    }

    const { data, error } = await supabase
      .from('child_posts').select('child_id').eq('photo_id', photoId)
    if (error) throw error

    return res.status(200).json({ success: true, childIds: (data || []).map((r) => r.child_id) })
  } catch (error) {
    console.error('child-posts list error:', error)
    return res.status(500).json({ error: 'Încărcarea copiilor asociați a eșuat', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(handler)
