import { supabase } from '../../../lib/supabaseClient'
import { normalizeText, matchesSearch } from '../../../lib/textUtils'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { 
    familyId, 
    search, 
    category, 
    hashtag, 
    sort = 'newest',
    dateStart,
    dateEnd,
    childId
  } = req.query

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    // Start with basic query
    let query = supabase
      .from('photos')
      .select('*')
      .eq('family_id', familyId)

    // Apply non-search filters at database level for performance
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply date range filter
    if (dateStart && dateEnd) {
      query = query.gte('created_at', dateStart).lte('created_at', dateEnd)
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'title_asc':
        query = query.order('title', { ascending: true })
        break
      case 'title_desc':
        query = query.order('title', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    let filteredData = data || []

    // Apply child filter by querying child_posts table separately
    if (childId) {
      // Get all photo IDs associated with this child
      const { data: childPosts, error: childError } = await supabase
        .from('child_posts')
        .select('photo_id')
        .eq('child_id', childId)

      if (childError) {
        console.error('Child posts fetch error:', childError)
      } else {
        // Filter photos to only include those associated with the selected child
        const childPhotoIds = childPosts.map(cp => cp.photo_id)
        filteredData = filteredData.filter(photo => childPhotoIds.includes(photo.id))
      }
    }

    // Apply diacritic-insensitive search filter client-side
    if (search) {
      // Check if search starts with # for hashtag search
      if (search.startsWith('#')) {
        const hashtagValue = search.substring(1)
        filteredData = filteredData.filter(item => {
          if (!item.hashtags || !Array.isArray(item.hashtags)) return false
          return item.hashtags.some(tag => matchesSearch(tag, hashtagValue))
        })
      } else {
        filteredData = filteredData.filter(item => {
          // Search in title, description, and hashtags
          const titleMatch = matchesSearch(item.title || '', search)
          const descriptionMatch = matchesSearch(item.description || '', search)
          
          // Search in hashtags
          let hashtagMatch = false
          if (item.hashtags && Array.isArray(item.hashtags)) {
            hashtagMatch = item.hashtags.some(tag => matchesSearch(tag, search))
          }
          
          return titleMatch || descriptionMatch || hashtagMatch
        })
      }
    }

    // Apply hashtag filter client-side for diacritic support
    if (hashtag) {
      filteredData = filteredData.filter(item => {
        if (!item.hashtags || !Array.isArray(item.hashtags)) return false
        return item.hashtags.some(tag => matchesSearch(tag, hashtag))
      })
    }

    return res.status(200).json({
      success: true,
      photos: filteredData
    })

  } catch (error) {
    console.error('Photos fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea fotografiilor a eșuat' })
  }
}