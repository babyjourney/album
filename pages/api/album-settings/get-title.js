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
    const { data: settings, error: settingsError } = await supabase
      .from('album_settings')
      .select('*')
      .eq('family_id', familyId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError
    }

    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('name')
      .eq('family_id', familyId)
      .order('display_order', { ascending: true })

    if (childrenError) {
      throw childrenError
    }

    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('name')
      .eq('id', familyId)
      .single()

    if (familyError) {
      throw familyError
    }

    let albumTitle = 'Family Album'

    if (!children || children.length === 0) {
      albumTitle = `Albumul familiei ${family.name}`
    } else if (children.length === 1) {
      albumTitle = `Albumul lui ${children[0].name}`
    } else {
      albumTitle = `Albumul familiei ${family.name}`
    }

    return res.status(200).json({
      success: true,
      title: albumTitle,
      childrenCount: children ? children.length : 0,
      isMultiChild: settings ? settings.is_multi_child : false,
      familyName: family.name
    })

  } catch (error) {
    console.error('Album title generation error:', error)
    return res.status(500).json({ error: 'Generarea titlului albumului a eșuat' })
  }
}

export default requireAuthOrAdmin(handler)
