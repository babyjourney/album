// Return the child ids currently associated with a post (item 3b — so the edit
// form can pre-check the right children). Family-scoped for security.
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda nu este permisă' })

  const photoId = req.query.photoId
  if (!photoId) return res.status(400).json({ error: 'photoId lipsește' })

  try {
    // Verify the post belongs to the caller's family (admins bypass).
    const { data: photo } = await supabase
      .from('photos').select('id, family_id').eq('id', photoId).single()
    if (!photo) return res.status(404).json({ error: 'Postarea nu a fost găsită' })
    if (!req.auth.isAdmin && photo.family_id !== req.auth.familyId) {
      return res.status(403).json({ error: 'Fotografia nu aparține familiei dvs.' })
    }

    const { data, error } = await supabase
      .from('child_posts').select('child_id').eq('photo_id', photoId)
    if (error) throw error

    return res.status(200).json({ success: true, childIds: (data || []).map((r) => r.child_id) })
  } catch (error) {
    console.error('child-posts list error:', error)
    return res.status(500).json({ error: 'Încărcarea copiilor asociați a eșuat' })
  }
}

export default requireAuthOrAdmin(handler)
