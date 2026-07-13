import { supabase } from '../../../lib/supabaseClient'
import { requireEditor, verifyFamilyOwnership } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { postId, title, description, hashtags, file_urls, customDate, coverIndex, isPrivate, category, childIds } = req.body

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' })
  }

  // Input validation
  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere' })
  }

  try {
    // Verify the post belongs to the authenticated family
    const ownershipCheck = await verifyFamilyOwnership(req.auth.familyId, 'photos', postId)
    
    if (!ownershipCheck.isOwner) {
      return res.status(403).json({ 
        error: ownershipCheck.error || 'Nu aveți permisiunea să modificați această postare',
        code: 'FORBIDDEN'
      })
    }

    // Normalize hashtags to the same format create-multi stores: a bare array
    // without the leading '#', lowercased (the client may send '#tag' strings
    // or a space-joined string). Prevents mixed formats across create vs edit.
    const normalizeHashtags = (h) => {
      if (h == null) return null
      const list = Array.isArray(h) ? h : String(h).split(/\s+/)
      const clean = list
        .map((t) => String(t).replace(/^#/, '').trim().toLowerCase())
        .filter((t) => t.length > 0)
      return clean
    }

    // Prepare update data
    const updateData = {
      title: title || null,
      description: description || null,
      hashtags: normalizeHashtags(hashtags),
      updated_at: new Date().toISOString()
    }

    // Handle cover index if provided
    if (coverIndex !== undefined) {
      updateData.cover_index = coverIndex
    }

    // Handle private flag if provided (editor-only — middleware already enforces)
    if (isPrivate !== undefined) {
      updateData.is_private = isPrivate === true
    }

    // Handle category if provided
    if (category !== undefined) {
      updateData.category = category || null
    }

    // Handle custom date if provided
    if (customDate) {
      updateData.created_at = new Date(customDate).toISOString()
    }

    // Get current post to check if it's multi-photo before updating
    // Try with file_urls first, fallback to just type and description if column doesn't exist
    let currentPostData = null
    let fetchError = null

    // Progressively drop the newest columns until the select works, so this
    // keeps functioning on a schema that predates poster_urls / file_urls.
    // NOTE: supabase-js returns {data, error} — a missing column does NOT throw,
    // so this has to be driven off `error`, not a try/catch.
    for (const cols of [
      'type, file_urls, poster_urls, description',
      'type, file_urls, description',
      'type, description',
    ]) {
      const { data, error } = await supabase
        .from('photos')
        .select(cols)
        .eq('id', postId)
        .single()

      if (!error) {
        currentPostData = data
        fetchError = null
        break
      }

      fetchError = error
      const missingColumn = error.code === '42703' || /column|does not exist/i.test(error.message || '')
      if (!missingColumn) break
      console.log(`update: retrying post fetch without one of [${cols}]`)
    }

    if (fetchError) {
      console.error('Error fetching current post:', fetchError)
    }
    
    console.log('Current post in database:', currentPostData)

    // CRITICAL: Preserve file_urls for multi-photo posts
    // First try to use new format, but fallback to old format if file_urls column doesn't exist
    if (file_urls !== undefined) {
      updateData.file_urls = file_urls
      console.log('Adding file_urls to update:', file_urls)

      // (Item 2) poster_urls is INDEX-ALIGNED with file_urls. The edit UI can
      // reorder photos and delete individual ones, so if we rewrite file_urls
      // and leave poster_urls alone, the pairing shifts: a video ends up showing
      // another clip's frame, or loses its poster entirely.
      //
      // Rebuild it by matching on URL — which survives any reordering — using the
      // OLD pairing as the source of truth.
      const asArray = (v) => {
        if (Array.isArray(v)) return v
        if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : null } catch { return null } }
        return null
      }
      const oldUrls = asArray(currentPostData?.file_urls)
      const oldPosters = asArray(currentPostData?.poster_urls)

      if (oldPosters && oldPosters.length) {
        const posterByUrl = new Map()
        ;(oldUrls || []).forEach((url, i) => {
          if (url && oldPosters[i]) posterByUrl.set(url, oldPosters[i])
        })
        const remapped = (Array.isArray(file_urls) ? file_urls : []).map((url) => posterByUrl.get(url) || null)
        if (remapped.some(Boolean)) updateData.poster_urls = remapped
        else updateData.poster_urls = null
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
        // Also append cover index in old format
        if (coverIndex !== undefined) {
          updateData.description += '\n__COVER_INDEX__:' + coverIndex
        }
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
        .eq('family_id', req.auth.familyId)
        .select()
      
      data = result.data
      error = result.error
      
      // poster_urls is the newest column — if it's missing, drop just that and
      // retry, rather than falling all the way back to the legacy format.
      if (error && /poster_urls/i.test(error.message || '') && updateData.poster_urls !== undefined) {
        console.warn('poster_urls column missing — retrying without it. Run sql/sergiu_batch2.sql.')
        const { poster_urls: _drop, ...withoutPosters } = updateData
        const retry = await supabase
          .from('photos')
          .update(withoutPosters)
          .eq('id', postId)
          .eq('family_id', req.auth.familyId)
          .select()
        data = retry.data
        error = retry.error
      }

      // If error indicates file_urls column doesn't exist, retry with old format
      if (error && error.message && error.message.includes('file_urls')) {
        console.log('file_urls column not found, retrying with old format')
        
        // Convert to old format if we have file_urls
        if (file_urls !== undefined) {
          const oldFormatUpdate = { ...updateData }
          delete oldFormatUpdate.file_urls
          delete oldFormatUpdate.cover_index // Remove from update as it will be in description
          oldFormatUpdate.description = (description || '') + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(file_urls)
          // Add cover index in old format
          if (coverIndex !== undefined) {
            oldFormatUpdate.description += '\n__COVER_INDEX__:' + coverIndex
          }
          
          console.log('Retrying with old format data:', oldFormatUpdate)
          
          const retryResult = await supabase
            .from('photos')
            .update(oldFormatUpdate)
            .eq('id', postId)
            .eq('family_id', req.auth.familyId)
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

    // (Item 3b) Rewrite child associations when childIds is provided. Delete the
    // existing links for this post, then insert the new set (only children that
    // belong to this family — prevents cross-family association).
    if (Array.isArray(childIds)) {
      try {
        await supabase.from('child_posts').delete().eq('photo_id', postId)
        if (childIds.length > 0) {
          const { data: ownChildren } = await supabase
            .from('children').select('id').eq('family_id', req.auth.familyId).in('id', childIds)
          const safeIds = (ownChildren || []).map((c) => c.id)
          if (safeIds.length > 0) {
            await supabase.from('child_posts').insert(
              safeIds.map((child_id) => ({ photo_id: postId, child_id, created_at: new Date().toISOString() }))
            )
          }
        }
      } catch (childErr) {
        console.error('Error updating child associations:', childErr)
        // Non-fatal: the post itself updated successfully.
      }
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

// Export with authentication middleware
export default requireEditor(handler)