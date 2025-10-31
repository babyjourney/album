import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { type, title, description, fileUrl, category, hashtags, customDate } = req.body

  // Use authenticated family ID instead of accepting it from request
  const familyId = req.auth.familyId

  if (!type || (!description && !fileUrl)) {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă' })
  }

  // Input validation and sanitization
  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere' })
  }

  // Validate post type
  if (!['image', 'video', 'text'].includes(type)) {
    return res.status(400).json({ error: 'Tip de postare invalid' })
  }

  try {
    // Parse hashtags from string to array
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    // Prepare the insert object with base required fields only
    const insertData = {
      family_id: familyId,
      title: title || '',
      description: description?.trim() || '',
      file_url: fileUrl,
      file_type: type // Keep for backwards compatibility
    }

    // Add optional fields only if they're provided (safely check if columns exist)
    try {
      if (type) {
        insertData.type = type
      }
      if (category) {
        insertData.category = category
      }
      if (hashtagArray && hashtagArray.length > 0) {
        insertData.hashtags = hashtagArray
      }
      if (customDate) {
        insertData.custom_date = customDate
      }
    } catch (schemaError) {
      console.log('Some optional columns may not exist yet:', schemaError.message)
    }

    // Insert post into photos table (which now handles all post types)
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
      post: data
    })

  } catch (error) {
    console.error('Post creation error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      requestBody: req.body
    })
    return res.status(500).json({ 
      error: `Crearea postării a eșuat: ${error.message}`,
      details: error.details,
      hint: error.hint
    })
  }
}

// Export with authentication middleware
export default requireEditor(handler)