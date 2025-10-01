import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, name, profilePictureUrl, birthDate, displayOrder } = req.body

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