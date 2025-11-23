// Helper function to detect and extract multi-photo URLs with cover reordering
export const getMultiPhotoUrls = (post) => {
  let urls = null
  let coverIndex = 0
  
  // Check for file_urls field (works for both 'multi-photo' and 'image' types with multiple files)
  if (post.file_urls) {
    // If file_urls is already an array, use it
    if (Array.isArray(post.file_urls)) {
      urls = post.file_urls
    } else {
      // If it's a string, try to parse it
      try {
        urls = JSON.parse(post.file_urls)
      } catch (e) {
        return null
      }
    }
    
    // Get cover index from post
    if (post.cover_index !== undefined) {
      coverIndex = post.cover_index || 0
    }
  }
  
  // Fallback to old format in description (for compatibility with existing posts)
  if (!urls && post.description && post.description.includes('__MULTI_PHOTO_URLS__:')) {
    try {
      const marker = '__MULTI_PHOTO_URLS__:'
      const markerIndex = post.description.indexOf(marker)
      const urlsJson = post.description.substring(markerIndex + marker.length)
      urls = JSON.parse(urlsJson)
      
      // Extract cover index from old format
      if (post.description.includes('__COVER_INDEX__:')) {
        const coverMatch = post.description.match(/__COVER_INDEX__:(\d+)/)
        if (coverMatch) {
          coverIndex = parseInt(coverMatch[1]) || 0
        }
      }
    } catch (e) {
      return null
    }
  }
  
  // Only process if there are actually multiple URLs
  if (urls && Array.isArray(urls) && urls.length > 1) {
    // Reorder URLs to put the cover image first for carousel display
    if (coverIndex > 0 && coverIndex < urls.length) {
      console.log(`Reordering images: coverIndex=${coverIndex}, total=${urls.length}`)
      const reorderedUrls = [...urls]
      const coverUrl = reorderedUrls[coverIndex]
      reorderedUrls.splice(coverIndex, 1)
      reorderedUrls.unshift(coverUrl)
      console.log('Original order:', urls.map((url, i) => `${i}: ${url.split('/').pop()}`))
      console.log('Reordered:', reorderedUrls.map((url, i) => `${i}: ${url.split('/').pop()}`))
      return reorderedUrls
    }
    
    return urls
  }
  
  return null
}

// Get cover/thumbnail image URL for a post
export const getCoverImageUrl = (post) => {
  const multiUrls = getMultiPhotoUrls(post)
  
  if (multiUrls && multiUrls.length > 1) {
    // For multi-photo posts, the first image in the reordered array is the cover
    return multiUrls[0]
  }
  
  // For single image posts
  return post.file_url
}

// Helper function to clean description from old multi-photo format
export const getCleanDescription = (post) => {
  if (!post.description) return ''
  
  // If this is a new format multi-photo post, just return the description as-is
  if (post.file_urls && Array.isArray(post.file_urls) && post.file_urls.length > 1) {
    return post.description
  }
  
  // Clean up old format descriptions that contain URLs
  if (post.description.includes('__MULTI_PHOTO_URLS__:')) {
    const marker = '__MULTI_PHOTO_URLS__:'
    const markerIndex = post.description.indexOf(marker)
    return post.description.substring(0, markerIndex).trim()
  }
  
  return post.description
}

// Check if post is a multi-photo post
export const isMultiPhotoPost = (post) => {
  const multiUrls = getMultiPhotoUrls(post)
  return multiUrls && multiUrls.length > 1
}

// Get the original order of images (before reordering for cover)
export const getOriginalImageUrls = (post) => {
  if (post.file_urls) {
    if (Array.isArray(post.file_urls)) {
      return post.file_urls
    } else {
      try {
        return JSON.parse(post.file_urls)
      } catch (e) {
        return null
      }
    }
  }
  
  // Fallback to old format
  if (post.description && post.description.includes('__MULTI_PHOTO_URLS__:')) {
    try {
      const marker = '__MULTI_PHOTO_URLS__:'
      const markerIndex = post.description.indexOf(marker)
      const urlsJson = post.description.substring(markerIndex + marker.length)
      return JSON.parse(urlsJson)
    } catch (e) {
      return null
    }
  }
  
  return null
}

export default {
  getMultiPhotoUrls,
  getCoverImageUrl,
  getCleanDescription,
  isMultiPhotoPost,
  getOriginalImageUrls
}