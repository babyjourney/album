import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId } = req.query

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    const { data, error } = await supabase
      .from('album_settings')
      .select('*')
      .eq('family_id', familyId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // If no settings exist, create default settings
    if (!data) {
      const { data: newSettings, error: createError } = await supabase
        .from('album_settings')
        .insert({
          family_id: familyId,
          is_multi_child: false
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return res.status(200).json({
        success: true,
        settings: newSettings
      })
    }

    return res.status(200).json({
      success: true,
      settings: data
    })

  } catch (error) {
    console.error('Album settings fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea setărilor albumului a eșuat' })
  }
}