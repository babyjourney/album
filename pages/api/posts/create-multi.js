import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { familyId, title, description, category, hashtags, selectedChildren, imageUrls } = req.body

  if (!familyId) {
    return res.status(400).json({ error: 'Family ID is required' })
  }

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'At least one image URL is required' })
  }

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
      file_url: imageUrls[0], // Primary image for backward compatibility
      file_type: 'image'
    }

    // Add optional fields
    if (category) {
      basePostData.category = category
    }
    if (hashtagArray && hashtagArray.length > 0) {
      basePostData.hashtags = hashtagArray
    }

    // Try new schema first, fallback to old schema if columns don't exist
    let createdPost
    try {
      // Try with new schema columns
      const newSchemaData = {
        ...basePostData,
        description: description?.trim() || '',
        type: 'multi-photo',
        file_urls: imageUrls
      }
      
      const { data: post, error: postError } = await supabase
        .from('photos')
        .insert(newSchemaData)
        .select()
        .single()

      if (postError) {
        // If error mentions column, throw to trigger fallback
        if (postError.message && (postError.message.includes('column') || postError.message.includes('does not exist'))) {
          throw new Error('New columns not available')
        }
        // Other errors should be thrown normally
        console.error('Error creating multi-photo post:', postError)
        return res.status(500).json({ error: 'Failed to create post' })
      }

      createdPost = post
      console.log('Successfully created multi-photo post with new schema')
    } catch (schemaError) {
      // Fallback to old schema with URLs in description
      console.log('Using old schema fallback for multi-photo post')
      const oldSchemaData = {
        ...basePostData,
        description: (description?.trim() || '') + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(imageUrls)
      }
      
      const { data: post, error: postError } = await supabase
        .from('photos')
        .insert(oldSchemaData)
        .select()
        .single()

      if (postError) {
        console.error('Error creating multi-photo post with old schema:', postError)
        return res.status(500).json({ error: 'Failed to create post' })
      }

      createdPost = post
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
    console.error('Error in create multi-photo API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}