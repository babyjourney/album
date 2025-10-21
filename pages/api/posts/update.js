import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('Update request received:', req.body)

  const { postId, title, description, hashtags, file_urls } = req.body

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' })
  }

  try {
    console.log('Attempting to update post:', { postId, title, description, hashtags, file_urls })
    
    // Prepare update data
    const updateData = {
      title: title || null,
      description: description || null,
      hashtags: hashtags || null,
      updated_at: new Date().toISOString()
    }

    // Get current post to check if it's multi-photo before updating
    // Try with file_urls first, fallback to just type and description if column doesn't exist
    let currentPostData = null
    let fetchError = null
    
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('type, file_urls, description')
        .eq('id', postId)
        .single()
      currentPostData = data
      fetchError = error
    } catch (error) {
      // If file_urls column doesn't exist, try without it
      if (error.message && error.message.includes('file_urls')) {
        console.log('file_urls column does not exist, using fallback query')
        const { data, error: fallbackError } = await supabase
          .from('photos')
          .select('type, description')
          .eq('id', postId)
          .single()
        currentPostData = data
        fetchError = fallbackError
      } else {
        fetchError = error
      }
    }
    
    if (fetchError) {
      console.error('Error fetching current post:', fetchError)
    }
    
    console.log('Current post in database:', currentPostData)

    // CRITICAL: Preserve file_urls for multi-photo posts
    // First try to use new format, but fallback to old format if file_urls column doesn't exist
    if (file_urls !== undefined) {
      try {
        // Try to update with file_urls column
        updateData.file_urls = file_urls
        console.log('Adding file_urls to update:', file_urls)
      } catch (error) {
        console.log('file_urls column not available, using old format in description')
      }
    } else if (currentPostData?.type === 'multi-photo' && currentPostData?.file_urls) {
      // Safety backup: If no file_urls provided but this is a multi-photo post, preserve existing
      updateData.file_urls = currentPostData.file_urls
      console.log('SAFETY BACKUP: Preserving existing file_urls for multi-photo post:', currentPostData.file_urls)
    } else if (currentPostData?.description && currentPostData.description.includes('__MULTI_PHOTO_URLS__:')) {
      // Check for old format multi-photo posts stored in description
      console.log('DETECTED OLD FORMAT MULTI-PHOTO POST - preserving in old format')
      
      if (file_urls !== undefined) {
        // Convert new file_urls to old format in description
        const cleanDescription = description || ''
        updateData.description = cleanDescription + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(file_urls)
        // Remove file_urls from update since column doesn't exist
        delete updateData.file_urls
        console.log('Converting file_urls to old format in description')
      } else {
        // Preserve existing description with URLs
        updateData.description = currentPostData.description
        console.log('Preserving existing old format description')
      }
    } else {
      console.log('NO file_urls provided in request - this could cause photo deletion for multi-photo posts!')
    }
    
    console.log('Final update data being sent to Supabase:', updateData)
    
    // Update the post in the database
    // Try with new schema first, fallback to old schema if needed
    let data, error
    
    try {
      const result = await supabase
        .from('photos')
        .update(updateData)
        .eq('id', postId)
        .select()
      
      data = result.data
      error = result.error
      
      // If error indicates file_urls column doesn't exist, retry with old format
      if (error && error.message && error.message.includes('file_urls')) {
        console.log('file_urls column not found, retrying with old format')
        
        // Convert to old format if we have file_urls
        if (file_urls !== undefined) {
          const oldFormatUpdate = { ...updateData }
          delete oldFormatUpdate.file_urls
          oldFormatUpdate.description = (description || '') + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(file_urls)
          
          console.log('Retrying with old format data:', oldFormatUpdate)
          
          const retryResult = await supabase
            .from('photos')
            .update(oldFormatUpdate)
            .eq('id', postId)
            .select()
          
          data = retryResult.data
          error = retryResult.error
        }
      }
    } catch (dbError) {
      error = dbError
    }

    console.log('Supabase response:', { data, error })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to update post: ' + error.message })
    }

    if (!data || data.length === 0) {
      console.log('No post found with ID:', postId)
      return res.status(404).json({ error: 'Post not found' })
    }

    console.log('Post updated successfully:', data[0])
    res.status(200).json({ 
      success: true, 
      message: 'Post updated successfully',
      post: data[0]
    })
  } catch (error) {
    console.error('Error in update API:', error)
    res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}