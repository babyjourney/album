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
    // Get album settings
    const { data: settings, error: settingsError } = await supabase
      .from('album_settings')
      .select('*')
      .eq('family_id', familyId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError
    }

    // Get children count
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('name')
      .eq('family_id', familyId)
      .order('display_order', { ascending: true })

    if (childrenError) {
      throw childrenError
    }

    // Get family info
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('name')
      .eq('id', familyId)
      .single()

    if (familyError) {
      throw familyError
    }

    // Generate title based on logic
    let albumTitle = 'Family Album'
    
    if (settings && settings.is_multi_child) {
      // Multi-child mode: always use family name
      if (settings.family_name) {
        albumTitle = `Albumul familiei "${settings.family_name}"`
      } else {
        albumTitle = `Albumul familiei "${family.name}"`
      }
    } else {
      // Single child mode: check number of children
      if (!children || children.length === 0) {
        // No children - use family name or primary child name from settings
        if (settings && settings.primary_child_name) {
          albumTitle = `Albumul "${settings.primary_child_name}"`
        } else if (settings && settings.family_name) {
          albumTitle = `Albumul familiei "${settings.family_name}"`
        } else {
          albumTitle = `Albumul familiei "${family.name}"`
        }
      } else if (children.length === 1) {
        // One child - use child's name
        albumTitle = `Albumul "${children[0].name}"`
      } else {
        // Multiple children but single-child mode - switch to family name
        if (settings && settings.family_name) {
          albumTitle = `Albumul familiei "${settings.family_name}"`
        } else {
          albumTitle = `Albumul familiei "${family.name}"`
        }
      }
    }

    return res.status(200).json({
      success: true,
      title: albumTitle,
      childrenCount: children ? children.length : 0,
      isMultiChild: settings ? settings.is_multi_child : false,
      familyName: settings ? settings.family_name : family.name,
      primaryChildName: settings ? settings.primary_child_name : null
    })

  } catch (error) {
    console.error('Album title generation error:', error)
    return res.status(500).json({ error: 'Generarea titlului albumului a eșuat' })
  }
}