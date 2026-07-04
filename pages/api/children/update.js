// Admin/editor → update an existing child (name, birth date, profile picture,
// display order). Used to backfill the first child's birth date and to add/edit
// a child's photo after creation (items 1a/1b).
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { id, name, birthDate, profilePictureUrl, displayOrder } = req.body || {}
  if (!id) return res.status(400).json({ error: 'ID-ul copilului este obligatoriu' })

  try {
    // Ownership: the child must belong to the caller's family (admins bypass).
    const { data: child, error: fetchErr } = await supabase
      .from('children').select('id, family_id').eq('id', id).single()
    if (fetchErr || !child) return res.status(404).json({ error: 'Copilul nu a fost găsit' })
    if (!req.auth.isAdmin && child.family_id !== req.auth.familyId) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să modificați acest copil' })
    }

    const patch = { updated_at: new Date().toISOString() }
    if (name !== undefined) {
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Numele nu poate fi gol' })
      patch.name = String(name).trim()
    }
    if (birthDate !== undefined) patch.birth_date = birthDate || null
    if (profilePictureUrl !== undefined) patch.profile_picture_url = profilePictureUrl || null
    if (displayOrder !== undefined) patch.display_order = displayOrder

    const { data, error } = await supabase
      .from('children').update(patch).eq('id', id).select().single()
    if (error) throw error

    return res.status(200).json({ success: true, child: data })
  } catch (error) {
    console.error('Child update error:', error)
    return res.status(500).json({ error: `Actualizarea copilului a eșuat: ${error.message}` })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
