import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId: rawFamilyId } = req.query
  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    // SECURITY: admins get full record (they manage PINs);
    // family sessions get a sanitized record with no PINs / phone number.
    const columns = req.auth.isAdmin
      ? '*'
      : 'id, name, profile_picture_url, email, created_at, updated_at, is_suspended, package'

    const { data, error } = await supabase
      .from('families')
      .select(columns)
      .eq('id', familyId)
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      family: data
    })

  } catch (error) {
    console.error('Family fetch error:', error)
    return res.status(500).json({ error: `Eroare la preluarea datelor familiei: ${error.message}` })
  }
}

export default requireAuthOrAdmin(handler)
