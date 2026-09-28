import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { type, title, description, fileUrl, category, hashtags, customDate, isPrivate, familyId: rawFamilyId } = req.body

  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu', errorKey: 'errFamilyIdRequired' })
  }

  if (!type || (!description && !fileUrl)) {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă', errorKey: 'errRequiredFields' })
  }

  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere', errorKey: 'errTitleTooLong' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere', errorKey: 'errDescTooLong' })
  }

  if (!['image', 'video', 'text'].includes(type)) {
    return res.status(400).json({ error: 'Tip de postare invalid', errorKey: 'errPostTypeInvalid' })
  }

  try {
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    const insertData = {
      family_id: familyId,
      title: title || '',
      description: description?.trim() || '',
      file_url: fileUrl,
      file_type: type,
      is_private: isPrivate === true
    }

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
        const d = new Date(customDate)
        if (!isNaN(d.getTime())) insertData.created_at = d.toISOString()
      }
    } catch (schemaError) {
      console.log('Some optional columns may not exist yet:', schemaError.message)
    }

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

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })