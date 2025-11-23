import { useState, useEffect } from 'react'

// Generate optimized image URLs with size parameters
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return originalUrl
  
  const {
    width = null,
    quality = 85,
    format = 'auto'
  } = options

  // If it's a Supabase storage URL, we can add transform parameters
  if (originalUrl.includes('supabase')) {
    const url = new URL(originalUrl)
    const params = new URLSearchParams()
    
    if (width) params.append('width', width.toString())
    params.append('quality', quality.toString())
    if (format !== 'auto') params.append('format', format)
    
    // Add transform parameters to Supabase URL
    url.search = params.toString()
    return url.toString()
  }
  
  return originalUrl
}

// Hook for progressive image loading with optimizations
export const useProgressiveImage = (src, options = {}) => {
  const [currentSrc, setCurrentSrc] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const optimizedSrc = getOptimizedImageUrl(src, options)
  
  useEffect(() => {
    if (!optimizedSrc) return
    
    setIsLoading(true)
    setIsLoaded(false)
    
    const img = new Image()
    
    img.onload = () => {
      setCurrentSrc(optimizedSrc)
      setIsLoaded(true)
      setIsLoading(false)
    }
    
    img.onerror = () => {
      setCurrentSrc(src) // Fallback to original
      setIsLoaded(true)
      setIsLoading(false)
    }
    
    img.src = optimizedSrc
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [optimizedSrc, src])

  return {
    src: currentSrc,
    isLoaded,
    isLoading
  }
}

// Pre-cache images for better performance
export const preloadImages = (imageUrls, options = {}) => {
  if (!imageUrls || !Array.isArray(imageUrls)) return

  const {
    maxConcurrent = 3,
    priority = false
  } = options

  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ url, success: true })
      img.onerror = () => resolve({ url, success: false })
      
      if (priority) {
        img.loading = 'eager'
        img.fetchPriority = 'high'
      }
      
      img.src = getOptimizedImageUrl(url, { width: 800, quality: 80 })
    })
  }

  // Load images in batches to avoid overwhelming the browser
  const loadBatch = async (urls) => {
    const batch = urls.splice(0, maxConcurrent)
    if (batch.length === 0) return
    
    await Promise.allSettled(batch.map(loadImage))
    
    if (urls.length > 0) {
      // Small delay between batches to prevent blocking
      setTimeout(() => loadBatch(urls), 100)
    }
  }

  loadBatch([...imageUrls])
}

export default {
  getOptimizedImageUrl,
  useProgressiveImage,
  preloadImages
}