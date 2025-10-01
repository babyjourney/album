import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { photoId, childIds } = req.body

  if (!photoId || !Array.isArray(childIds) || childIds.length === 0) {
    return res.status(400).json({ error: 'ID-ul fotografiei și lista de copii sunt obligatorii' })
  }

  try {
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