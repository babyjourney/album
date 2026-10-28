import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { getPackageLimits } from '../../../lib/packages'
import { getTier } from '../../../lib/tiers'
import { storedMediaKindFromUrl, isOwnStorageUrl } from '../../../lib/fileTypes'
import { verifyStoredVideoSeconds } from '../../../lib/videoCompress'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { type, title, description, fileUrl, category, hashtags, customDate, isPrivate, videoDuration, familyId: rawFamilyId } = req.body

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

  if (fileUrl) {
    const mediaKind = typeof fileUrl === 'string' ? storedMediaKindFromUrl(fileUrl) : null
    if (!mediaKind) {
      return res.status(400).json({
        error: 'Tip de fișier neacceptat. Sunt permise doar fotografii (JPG, PNG, GIF, HEIC/HEIF, WebP, JXL) și video-uri (MP4, MOV, M4V, WebM).',
        errorKey: 'errFileTypeNotAllowed',
      })
    }
    if (!isOwnStorageUrl(fileUrl, familyId)) {
      return res.status(400).json({
        error: 'Fișierul nu aparține acestui album. Încarcă-l din nou și încearcă iar.',
        errorKey: 'errFileNotInAlbum',
      })
    }
    if (mediaKind === 'video') {
      const verifiedSeconds = await verifyStoredVideoSeconds(fileUrl, videoDuration)
      if (verifiedSeconds === null) {
        return res.status(400).json({
          error: 'Durata video-ului nu a putut fi verificată. Reîncarcă pagina și încearcă din nou.',
          errorKey: 'errVideoDurationMissing',
          code: 'VIDEO_DURATION_MISSING',
        })
      }
      const { data: famRow, error: famError } = await supabase
        .from('families')
        .select('package')
        .eq('id', familyId)
        .maybeSingle()
      if (famError) {
        console.error('Package lookup failed (create):', famError)
      }
      const familyPackage = famRow?.package || 'free'
      const limit = getPackageLimits(familyPackage).maxVideoSeconds
      if (Math.floor(verifiedSeconds) > limit) {
        return res.status(413).json({
          error: `Video-urile mai lungi de ${limit} secunde nu sunt disponibile pentru pachetul ${getTier(familyPackage).label}.`,
          errorKey: 'errVideoTooLongForPlan',
          code: 'VIDEO_TOO_LONG',
          maxVideoSeconds: limit,
          package: familyPackage,
        })
      }
    }
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
      error: 'Crearea postării a eșuat',
      errorKey: 'postCreationFailed',
      details: error.details,
      hint: error.hint
    })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })