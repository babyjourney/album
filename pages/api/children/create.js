import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId: rawFamilyId, name, profilePictureUrl, birthDate, displayOrder } = req.body

  // SECURITY: For family sessions, familyId is forced to the session's family
  // (requireAuthOrAdmin already verified any provided familyId matches).
  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId || !name) {
    return res.status(400).json({ error: 'ID-ul familiei și numele sunt obligatorii' })
  }

  try {
    const insertData = {
      family_id: familyId,
      name: name.trim(),
      display_order: displayOrder || 0
    }

    if (profilePictureUrl) {
      insertData.profile_picture_url = profilePictureUrl
    }

    if (birthDate) {
      insertData.birth_date = birthDate
    }

    const { data, error } = await supabase
      .from('children')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      child: data
    })

  } catch (error) {
    console.error('Child creation error:', error)
    return res.status(500).json({ error: `Crearea copilului a eșuat: ${error.message}` })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
