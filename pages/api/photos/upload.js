import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { getPackageLimits } from '../../../lib/packages'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { title, description, fileUrl, fileType, category, hashtags, customDate, isPrivate, videoDurations } = req.body

  // SECURITY: derive family from authenticated session; never trust body
  const familyId = req.auth.familyId

  if (!familyId || !title || !fileUrl) {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă' })
  }

  // Enforce the family's package video-duration limit. Photos are always
  // allowed. We trust the client-reported duration only as a fast-path
  // hint — by accepting `null`/missing values we don't reject when the
  // browser couldn't read metadata, but if a duration is present and
  // exceeds the limit we refuse the upload.
  if (fileType === 'video') {
    try {
      const { data: fam } = await supabase
        .from('families')
        .select('package')
        .eq('id', familyId)
        .single()

      const pkg = fam?.package || 'free'
      const limit = getPackageLimits(pkg).maxVideoSeconds
      const reportedDuration = Array.isArray(videoDurations)
        ? videoDurations[0]
        : (typeof videoDurations === 'number' ? videoDurations : null)

      if (typeof reportedDuration === 'number' && reportedDuration > limit) {
        return res.status(413).json({
          error: `Video-urile mai lungi de ${limit} secunde nu sunt disponibile pentru pachetul ${pkg === 'premium' ? 'Premium' : 'Free'}.`,
          code: 'VIDEO_TOO_LONG',
          maxVideoSeconds: limit,
          package: pkg
        })
      }
    } catch (limitErr) {
      console.error('Package limit lookup failed:', limitErr)
      // Fail open — let the upload proceed rather than blocking on a
      // transient lookup failure. The admin can still moderate later.
    }
  }

  try {
    // Parse hashtags from string to array
    const hashtagArray = hashtags ?
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    // Look up the family's package once more to stamp the quality tier on
    // the row. This drives the "HD" badge in the UI and lets us downgrade
    // delivery if a Premium family later drops to Free.
    const { data: famQuality } = await supabase
      .from('families')
      .select('package')
      .eq('id', familyId)
      .single()
    const tier = famQuality?.package
    const quality = getPackageLimits(tier).imageQuality

    // Prepare the insert object with base fields
    const insertData = {
      family_id: familyId,
      title: title.trim(),
      description: description?.trim() || '',
      file_url: fileUrl,
      file_type: fileType || 'image',
      is_private: isPrivate === true,
      quality
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

    // Insert photo directly without relying on RLS. If the deployed schema
    // pre-dates the `quality` column we retry without it once.
    let { data, error } = await supabase
      .from('photos')
      .insert(insertData)
      .select()
      .single()

    if (error && error.message && (error.message.includes('column') || error.code === '42703')) {
      const { quality: _q, ...withoutQuality } = insertData
      ;({ data, error } = await supabase
        .from('photos')
        .insert(withoutQuality)
        .select()
        .single())
    }

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

export default requireEditor(handler)
