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

  if (title && title.length > 200) {
    return res.status(400).json({ error: 'Titlul nu poate depăși 200 de caractere', errorKey: 'errTitleTooLong' })
  }

  if (description && description.length > 2000) {
    return res.status(400).json({ error: 'Descrierea nu poate depăși 2000 de caractere', errorKey: 'errDescTooLong' })
  }

  try {
    const ownershipCheck = await verifyFamilyOwnership(req.auth.familyId, 'photos', postId)
    
    if (!ownershipCheck.isOwner) {
      return res.status(403).json({ 
        error: ownershipCheck.error || 'Nu aveți permisiunea să modificați această postare', errorKey: 'errNoEditPermission',
        code: 'FORBIDDEN'
      })
    }

    const normalizeHashtags = (h) => {
      if (h == null) return null
      const list = Array.isArray(h) ? h : String(h).split(/\s+/)
      const clean = list
        .map((t) => String(t).replace(/^#/, '').trim().toLowerCase())
        .filter((t) => t.length > 0)
      return clean
    }

    const updateData = {
      title: title || null,
      description: description || null,
      hashtags: normalizeHashtags(hashtags),
      updated_at: new Date().toISOString()
    }

    if (coverIndex !== undefined) {
      updateData.cover_index = coverIndex
    }

    if (isPrivate !== undefined) {
      updateData.is_private = isPrivate === true
    }

    if (category !== undefined) {
      updateData.category = category || null
    }

    if (customDate) {
      updateData.created_at = new Date(customDate).toISOString()
    }

    const removedStorageUrls = []

    let currentPostData = null
    let fetchError = null

    for (const cols of [
      'type, file_urls, poster_urls, file_sizes, description',
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

    if (file_urls !== undefined) {
      updateData.file_urls = file_urls
      console.log('Adding file_urls to update:', file_urls)

      const asArray = (v) => {
        if (Array.isArray(v)) return v
        if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : null } catch { return null } }
        return null
      }
      const oldUrls = asArray(currentPostData?.file_urls)
      const oldPosters = asArray(currentPostData?.poster_urls)

      if (Array.isArray(file_urls) && file_urls.length > 0) {
        const ci = Number.isInteger(coverIndex) && coverIndex >= 0 && coverIndex < file_urls.length ? coverIndex : 0
        updateData.file_url = file_urls[ci] || file_urls[0]
      }

      if (Array.isArray(file_urls) && oldUrls) {
        const keep = new Set(file_urls)
        oldUrls.forEach((url, i) => {
          if (!url || keep.has(url)) return
          removedStorageUrls.push(url)
          if (oldPosters && oldPosters[i]) removedStorageUrls.push(oldPosters[i])
        })
      }

      const oldSizes = asArray(currentPostData?.file_sizes)
      if (oldSizes && oldSizes.length && oldUrls) {
        const sizeByUrl = new Map()
        oldUrls.forEach((url, i) => {
          if (url && oldSizes[i] !== undefined && oldSizes[i] !== null) sizeByUrl.set(url, oldSizes[i])
        })
        updateData.file_sizes = (Array.isArray(file_urls) ? file_urls : []).map((url) => sizeByUrl.get(url) ?? null)
      }

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
      updateData.file_urls = currentPostData.file_urls
      console.log('SAFETY BACKUP: Preserving existing file_urls for multi-photo post:', currentPostData.file_urls)
    } else if (currentPostData?.description && currentPostData.description.includes('__MULTI_PHOTO_URLS__:')) {
      console.log('DETECTED OLD FORMAT MULTI-PHOTO POST - preserving in old format')
      
      if (file_urls !== undefined) {
        const cleanDescription = description || ''
        updateData.description = cleanDescription + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(file_urls)
        if (coverIndex !== undefined) {
          updateData.description += '\n__COVER_INDEX__:' + coverIndex
        }
        delete updateData.file_urls
        console.log('Converting file_urls to old format in description')
      } else {
        updateData.description = currentPostData.description
        console.log('Preserving existing old format description')
      }
    } else {
      console.log('NO file_urls provided in request - this could cause photo deletion for multi-photo posts!')
    }
    
    console.log('Final update data being sent to Supabase:', updateData)
    
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
      
      if (error && /poster_urls|file_sizes/i.test(error.message || '') && (updateData.poster_urls !== undefined || updateData.file_sizes !== undefined)) {
        console.warn('poster_urls/file_sizes column missing — retrying without them. Run supabase-migration.sql.')
        const { poster_urls: _drop, file_sizes: _drop2, ...withoutPosters } = updateData
        const retry = await supabase
          .from('photos')
          .update(withoutPosters)
          .eq('id', postId)
          .eq('family_id', req.auth.familyId)
          .select()
        data = retry.data
        error = retry.error
      }

      if (error && error.message && error.message.includes('file_urls')) {
        console.log('file_urls column not found, retrying with old format')
        
        if (file_urls !== undefined) {
          const oldFormatUpdate = { ...updateData }
          delete oldFormatUpdate.file_urls
          delete oldFormatUpdate.cover_index
          oldFormatUpdate.description = (description || '') + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(file_urls)
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
      return res.status(404).json({ error: 'Post not found', errorKey: 'errPostNotFound' })
    }

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
      }
    }

    if (removedStorageUrls.length) {
      try {
        const paths = [...new Set(removedStorageUrls.map((url) => url.split('/').slice(-2).join('/')))]
        await supabase.storage.from('album_uploads').remove(paths)
      } catch (storageErr) {
        console.warn('update: could not delete removed files from storage:', storageErr)
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

export default requireEditor(handler)