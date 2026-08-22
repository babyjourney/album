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

  // Use authenticated family ID
  const familyId = req.auth.familyId

  const imageUrls = Array.isArray(rawImageUrls) ? rawImageUrls : []

  // (Item 2) Poster frames for videos, index-aligned with imageUrls. Normalized
  // to exactly the same length so posterUrls[i] always describes imageUrls[i],
  // and only kept for entries that really are videos.
  const posterUrls = imageUrls.map((url, i) => {
    const poster = Array.isArray(rawPosterUrls) ? rawPosterUrls[i] : null
    if (!poster || typeof poster !== 'string') return null
    return isVideoUrl(url) ? poster : null
  })
  const hasAnyPoster = posterUrls.some(Boolean)

  // (Item 7) Byte size of each stored file, index-aligned with imageUrls, so the
  // admin storage total is measured rather than guessed.
  const fileSizes = imageUrls.map((_, i) => {
    const n = Array.isArray(rawFileSizes) ? Number(rawFileSizes[i]) : NaN
    return Number.isFinite(n) && n >= 0 ? n : null
  })
  const hasAnySize = fileSizes.some((n) => n !== null)
  // (Item 11) A post with no media is a TEXT post — allowed as long as it has a
  // title or a description. Only reject when there's truly nothing to save.
  const isTextPost = imageUrls.length === 0
  if (isTextPost && !(title && title.trim()) && !(description && description.trim())) {
    return res.status(400).json({ error: 'Adaugă cel puțin un fișier sau un titlu/descriere', errorKey: 'errAtLeastOneFileOrText' })
  }

  // Input validation
  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere', errorKey: 'errTitleTooLong' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere', errorKey: 'errDescTooLong' })
  }

  if (imageUrls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 fișiere per postare', errorKey: 'errMaxFiles' })
  }

  // (Sergiu 03.07 #3) In a multi-child album every post must be linked to at
  // least one child, or it only ever shows under "all kids". The upload form
  // enforces this too; this is the server-side guarantee.
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
    // Fail open — the client already enforces it.
  }

  // Determine the overall type of the post (text | video > audio > document > image).
  const hasVideo = imageUrls.some(url => isVideoUrl(url))
  const postFileType = isTextPost ? 'text' : detectPostType(imageUrls)

  // Enforce the family's package video-duration limit on any reported
  // video file. We only block when the client gave us a concrete duration
  // that exceeds the cap — missing values fail open so a flaky probe
  // doesn't break uploads. Client-side validation is the primary UX path;
  // this is defense in depth.
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
        // Whole-second comparison, same as the client (a "1:00" phone clip is
        // 60.x seconds and must be accepted on the 60s plan).
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
      // Fail open: do not block the upload on a transient lookup failure.
    }
  }

  try {
    // Parse hashtags from string to array like the regular upload API
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    // Quality tier stamp (Task #15) — derived from the family's package so
    // it persists with the row and the UI can show an HD/SD badge later.
    // We attach it to basePostData below; if a deployed schema doesn't have
    // the column yet, the existing column-error fallback strips it.
    const { data: famQuality } = await supabase
      .from('families')
      .select('package')
      .eq('id', familyId)
      .single()
    const tier = famQuality?.package
    const quality = getPackageLimits(tier).imageQuality

    // Build base post data
    const basePostData = {
      family_id: familyId,
      title: title?.trim() || '',
      file_url: imageUrls[0] || null, // Primary file (null for text posts)
      file_type: postFileType, // 'text' for no-media posts
      is_private: isPrivate === true,
      quality
    }
    // Helper used by every fallback path so the quality field disappears
    // gracefully when the column doesn't exist in the deployed schema.
    const stripQuality = (obj) => {
      const { quality: _q, ...rest } = obj
      return rest
    }

    // Add optional fields
    if (category) {
      basePostData.category = category
    }
    if (hashtagArray && hashtagArray.length > 0) {
      basePostData.hashtags = hashtagArray
    }
    // (Item 7) Honor the user-chosen post date by overriding created_at — the
    // whole app sorts/filters/displays by created_at (feed, calendar, age
    // timelines, "on this day"). Previously customDate was dropped entirely, so
    // posts always got today's date on first save.
    if (customDate) {
      const d = new Date(customDate)
      if (!isNaN(d.getTime())) basePostData.created_at = d.toISOString()
    }

    // Validate cover index - only use it if explicitly provided and valid
    let validCoverIndex = 0
    if (coverIndex !== undefined && coverIndex !== null && coverIndex >= 0 && coverIndex < imageUrls.length) {
      validCoverIndex = parseInt(coverIndex)
    }

    // Update base post data to use selected cover as primary URL
    if (validCoverIndex > 0 && validCoverIndex < imageUrls.length) {
      basePostData.file_url = imageUrls[validCoverIndex]
    }

    // Try multiple schema approaches to ensure compatibility
    let createdPost
    let useOldFormat = false
    
    try {
      // First try: New schema with file_urls and cover_index
      const newSchemaData = {
        ...basePostData,
        description: description?.trim() || '',
        type: postFileType,
        file_urls: isTextPost ? null : imageUrls
      }

      // Only add cover_index if it's been provided and is valid
      if (coverIndex !== undefined && coverIndex !== null) {
        newSchemaData.cover_index = validCoverIndex
      }

      if (hasAnyPoster) {
        newSchemaData.poster_urls = posterUrls
      }
      if (hasAnySize) {
        newSchemaData.file_sizes = fileSizes
      }

      // poster_urls is the newest column (sql/sergiu_batch2.sql). If a deploy
      // hasn't run that migration, retry once without it — losing the poster is
      // fine, losing file_urls (which the generic fallback below would do) is not.
      let { data: post, error: postError } = await supabase
        .from('photos')
        .insert(newSchemaData)
        .select()
        .single()

      if (postError && /poster_urls|file_sizes/i.test(postError.message || '')) {
        console.warn('poster_urls/file_sizes column missing — retrying without them. Run sql/sergiu_batch2.sql.')
        const { poster_urls: _p, file_sizes: _s, ...withoutNewCols } = newSchemaData
        ;({ data: post, error: postError } = await supabase
          .from('photos')
          .insert(withoutNewCols)
          .select()
          .single())
      }

      if (postError) {
        // If error mentions column, throw to trigger fallback
        if (postError.message && (postError.message.includes('column') || postError.message.includes('does not exist'))) {
          throw new Error('New schema not available: ' + postError.message)
        }
        // Other errors should be thrown normally
        console.error('Error creating multi-photo post:', postError)
        return res.status(500).json({ error: 'Failed to create post: ' + postError.message })
      }

      createdPost = post
      console.log('Successfully created multi-photo post with new schema')
      
    } catch (schemaError) {
      console.log('New schema failed, trying without file_urls column:', schemaError.message)
      useOldFormat = true
    }

    // Second try: Schema without file_urls (fallback). Also drops the new
    // `quality` column in case the deployed schema doesn't have it yet.
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
        
        // Third try: Old schema with URLs in description
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

    // Handle child associations if multi-child is enabled
    if (selectedChildren && selectedChildren.length > 0) {
      // SECURITY: confirm every selectedChildren id belongs to caller's family
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
          // Continue anyway - post was created successfully
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
    
    // Return more specific error message for debugging
    const errorMessage = error.message || 'Internal server error'
    res.status(500).json({ 
      error: `Multi-photo post creation failed: ${errorMessage}`,
      details: error.details,
      hint: error.hint
    })
  }
}

// Export with authentication middleware
export default requireEditor(handler)