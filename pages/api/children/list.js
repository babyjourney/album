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
      .from('children')
      .select('*')
      .eq('family_id', familyId)
      .order('display_order', { ascending: true })

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      children: data || []
    })

  } catch (error) {
    console.error('Children fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea copiilor a eșuat' })
  }
}