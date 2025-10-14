import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, title, description, fileUrl, fileType, category, hashtags, customDate } = req.body

  if (!familyId || !title || !fileUrl) {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă' })
  }

  try {
    // Parse hashtags from string to array
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    // Prepare the insert object with base fields
    const insertData = {
      family_id: familyId,
      title: title.trim(),
      description: description?.trim() || '',
      file_url: fileUrl,
      file_type: fileType || 'image'
    }

    // Add optional fields only if they're provided
    if (category) {
      insertData.category = category
    }
    if (hashtagArray && hashtagArray.length > 0) {
      insertData.hashtags = hashtagArray
    }
    if (customDate) {
      insertData.custom_date = customDate
    }

    // Insert photo directly without relying on RLS
    const { data, error } = await supabase
      .from('photos')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      photo: data
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    return res.status(500).json({ error: `Salvarea fotografiei a eșuat: ${error.message}` })
  }
}