import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, isMultiChild } = req.body

  if (!familyId || typeof isMultiChild !== 'boolean') {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă sau invalide' })
  }

  try {
    const { data, error } = await supabase
      .from('album_settings')
      .upsert({
        family_id: familyId,
        is_multi_child: isMultiChild,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'family_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      settings: data
    })

  } catch (error) {
    console.error('Album settings update error:', error)
    return res.status(500).json({ error: `Actualizarea setărilor albumului a eșuat: ${error.message}` })
  }
}