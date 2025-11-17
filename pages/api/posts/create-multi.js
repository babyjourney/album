import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, description, category, hashtags, selectedChildren, imageUrls, customDate, coverIndex } = req.body

  // Use authenticated family ID
  const familyId = req.auth.familyId

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'At least one image URL is required' })
  }

  // Input validation
  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere' })
  }

  if (imageUrls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 fișiere per postare' })
  }

  // Helper function to detect if URL is a video
  const isVideoUrl = (url) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext))
  }

  // Determine the overall type of the post
  const hasVideo = imageUrls.some(url => isVideoUrl(url))
  const postFileType = hasVideo ? 'video' : 'image'

  try {
    // Parse hashtags from string to array like the regular upload API
    const hashtagArray = hashtags ? 
      hashtags.split(/\s+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0) : []

    // Build base post data
    const basePostData = {
      family_id: familyId,
      title: title?.trim() || '',
      file_url: imageUrls[0], // Primary file for backward compatibility
      file_type: postFileType // Set correct type based on content
    }

    // Add optional fields
    if (category) {
      basePostData.category = category
    }
    if (hashtagArray && hashtagArray.length > 0) {
      basePostData.hashtags = hashtagArray
    }
    // Remove custom_date field as it doesn't exist in the schema
    // if (customDate) {
    //   basePostData.custom_date = customDate
    // }

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
        type: 'image',
        file_urls: imageUrls
      }

      // Only add cover_index if it's been provided and is valid
      if (coverIndex !== undefined && coverIndex !== null) {
        newSchemaData.cover_index = validCoverIndex
      }
      
      const { data: post, error: postError } = await supabase
        .from('photos')
        .insert(newSchemaData)
        .select()
        .single()

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

    // Second try: Schema without file_urls (fallback)
    if (useOldFormat) {
      try {
        const mediumSchemaData = {
          ...basePostData,
          description: description?.trim() || '',
          type: 'image'
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
          ...basePostData,
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
      const childPosts = selectedChildren.map(childId => ({
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