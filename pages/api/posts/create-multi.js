import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { getPackageLimits } from '../../../lib/packages'
import { getTier } from '../../../lib/tiers'
import { isVideoUrl, detectPostType } from '../../../lib/fileTypes'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, description, category, hashtags, selectedChildren, imageUrls: rawImageUrls, posterUrls: rawPosterUrls, fileSizes: rawFileSizes, customDate, coverIndex, isPrivate, videoDurations } = req.body

  const familyId = req.auth.familyId

  const imageUrls = Array.isArray(rawImageUrls) ? rawImageUrls : []

  const posterUrls = imageUrls.map((url, i) => {
    const poster = Array.isArray(rawPosterUrls) ? rawPosterUrls[i] : null
    if (!poster || typeof poster !== 'string') return null
    return isVideoUrl(url) ? poster : null
  })
  const hasAnyPoster = posterUrls.some(Boolean)

  const fileSizes = imageUrls.map((_, i) => {
    const n = Array.isArray(rawFileSizes) ? Number(rawFileSizes[i]) : NaN
    return Number.isFinite(n) && n >= 0 ? n : null
  })
  const hasAnySize = fileSizes.some((n) => n !== null)
  const isTextPost = imageUrls.length === 0
  if (isTextPost && !(title && title.trim()) && !(description && description.trim())) {
    return res.status(400).json({ error: 'Adaugă cel puțin un fișier sau un titlu/descriere', errorKey: 'errAtLeastOneFileOrText' })
  }

  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere', errorKey: 'errTitleTooLong' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere', errorKey: 'errDescTooLong' })
  }

  if (imageUrls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 fișiere per postare', errorKey: 'errMaxFiles' })
  }

  try {
    const { data: albumSettings } = await supabase
      .from('album_settings')
      .select('is_multi_child')
      .eq('family_id', familyId)
      .maybeSingle()
    if (albumSettings?.is_multi_child && (!Array.isArray(selectedChildren) || selectedChildren.length === 0)) {
      return res.status(400).json({
        error: 'Selectează cel puțin un copil pentru această postare',
        errorKey: 'selectAtLeastOneChild',
      })
    }
  } catch (settingsErr) {
    console.error('album_settings lookup failed (create-multi):', settingsErr)
  }

  const hasVideo = imageUrls.some(url => isVideoUrl(url))
  const postFileType = isTextPost ? 'text' : detectPostType(imageUrls)

  if (hasVideo && Array.isArray(videoDurations) && videoDurations.length > 0) {
    try {
      const { data: fam } = await supabase
        .from('families')
        .select('package')
        .eq('id', familyId)
        .single()

      const pkg = fam?.package || 'free'
      const limit = getPackageLimits(pkg).maxVideoSeconds

      for (let i = 0; i < videoDurations.length; i++) {
        const url = imageUrls[i]
        const dur = videoDurations[i]
        if (!url || !isVideoUrl(url)) continue
        if (typeof dur !== 'number') continue
        if (Math.floor(dur) > limit) {
          return res.status(413).json({
            error: `Video-urile mai lungi de ${limit} secunde nu sunt disponibile pentru pachetul ${getTier(pkg).label}.`,
            errorKey: 'errVideoTooLongForPlan',
            code: 'VIDEO_TOO_LONG',
            maxVideoSeconds: limit,
            package: pkg
          })
        }
      }
    } catch (limitErr) {
      console.error('Package limit lookup failed (create-multi):', limitErr)
    }
  }

  try {
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    const { data: famQuality } = await supabase
      .from('families')
      .select('package')
      .eq('id', familyId)
      .single()
    const tier = famQuality?.package
    const quality = getPackageLimits(tier).imageQuality

    const basePostData = {
      family_id: familyId,
      title: title?.trim() || '',
      file_url: imageUrls[0] || null,
      file_type: postFileType,
      is_private: isPrivate === true,
      quality
    }
    const stripQuality = (obj) => {
      const { quality: _q, ...rest } = obj
      return rest
    }

    if (category) {
      basePostData.category = category
    }
    if (hashtagArray && hashtagArray.length > 0) {
      basePostData.hashtags = hashtagArray
    }
    if (customDate) {
      const d = new Date(customDate)
      if (!isNaN(d.getTime())) basePostData.created_at = d.toISOString()
    }

    let validCoverIndex = 0
    if (coverIndex !== undefined && coverIndex !== null && coverIndex >= 0 && coverIndex < imageUrls.length) {
      validCoverIndex = parseInt(coverIndex)
    }

    if (validCoverIndex > 0 && validCoverIndex < imageUrls.length) {
      basePostData.file_url = imageUrls[validCoverIndex]
    }

    let createdPost
    let useOldFormat = false
    
    try {
      const newSchemaData = {
        ...basePostData,
        description: description?.trim() || '',
        type: postFileType,
        file_urls: isTextPost ? null : imageUrls
      }

      if (coverIndex !== undefined && coverIndex !== null) {
        newSchemaData.cover_index = validCoverIndex
      }

      if (hasAnyPoster) {
        newSchemaData.poster_urls = posterUrls
      }
      if (hasAnySize) {
        newSchemaData.file_sizes = fileSizes
      }

      let { data: post, error: postError } = await supabase
        .from('photos')
        .insert(newSchemaData)
        .select()
        .single()

      if (postError && /poster_urls|file_sizes/i.test(postError.message || '')) {
        console.warn('poster_urls/file_sizes column missing — retrying without them. Run supabase-migration.sql.')
        const { poster_urls: _p, file_sizes: _s, ...withoutNewCols } = newSchemaData
        ;({ data: post, error: postError } = await supabase
          .from('photos')
          .insert(withoutNewCols)
          .select()
          .single())
      }

      if (postError) {
        if (postError.message && (postError.message.includes('column') || postError.message.includes('does not exist'))) {
          throw new Error('New schema not available: ' + postError.message)
        }
        console.error('Error creating multi-photo post:', postError)
        return res.status(500).json({ error: 'Failed to create post: ' + postError.message })
      }

      createdPost = post
      console.log('Successfully created multi-photo post with new schema')
      
    } catch (schemaError) {
      console.log('New schema failed, trying without file_urls column:', schemaError.message)
      useOldFormat = true
    }

    if (useOldFormat) {
      try {
        const mediumSchemaData = {
          ...stripQuality(basePostData),
          description: description?.trim() || '',
          type: postFileType
        }
        
        const { data: post, error: postError } = await supabase
          .from('photos')
          .insert(mediumSchemaData)
          .select()
          .single()

        if (postError) {
          throw new Error('Medium schema failed: ' + postError.message)
        }

        createdPost = post
        console.log('Successfully created multi-photo post with medium schema (no file_urls)')
        
      } catch (mediumError) {
        console.log('Medium schema also failed, trying old schema fallback:', mediumError.message)
        
        const oldSchemaData = {
          ...stripQuality(basePostData),
          description: (description?.trim() || '') + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(imageUrls) + 
            (coverIndex !== undefined && coverIndex !== null ? '\n__COVER_INDEX__:' + validCoverIndex : '')
        }
        
        const { data: post, error: postError } = await supabase
          .from('photos')
          .insert(oldSchemaData)
          .select()
          .single()

        if (postError) {
          console.error('Error creating multi-photo post with old schema:', postError)
          throw new Error('All schema approaches failed: ' + postError.message)
        }

        createdPost = post
        console.log('Successfully created multi-photo post with old schema fallback')
      }
    }

    if (selectedChildren && selectedChildren.length > 0) {
      const { data: childRows } = await supabase
        .from('children')
        .select('id, family_id')
        .in('id', selectedChildren)

      const safeChildIds = (childRows || [])
        .filter(c => c.family_id === familyId)
        .map(c => c.id)

      if (safeChildIds.length > 0) {
        const childPosts = safeChildIds.map(childId => ({
          child_id: childId,
          photo_id: createdPost.id,
          created_at: new Date().toISOString()
        }))

        const { error: childError } = await supabase
          .from('child_posts')
          .insert(childPosts)

        if (childError) {
          console.error('Error associating children with post:', childError)
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Multi-photo post created successfully',
      post: createdPost
    })
  } catch (error) {
    console.error('Error in create multi-photo API:', {
      message: error.message,
      stack: error.stack,
      details: error.details,
      code: error.code,
      requestBody: req.body
    })
    
    const errorMessage = error.message || 'Internal server error'
    res.status(500).json({ 
      error: `Multi-photo post creation failed: ${errorMessage}`,
      details: error.details,
      hint: error.hint
    })
  }
}

export default requireEditor(handler)