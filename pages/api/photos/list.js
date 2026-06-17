import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { normalizeText, matchesSearch } from '../../../lib/textUtils'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const {
    familyId: rawFamilyId,
    search,
    category,
    hashtag,
    sort = 'newest',
    dateStart,
    dateEnd,
    childId,
    ageMinMonths,   // age-range timeline tabs (Birth/Toddler/School/Teenage)
    ageMaxMonths,
    categoryAny,    // comma list — match any (Health/Education filtered views)
    hashtagsAny,    // comma list — match any hashtag
    monthDay        // 'MM-DD' — "On This Day" (same calendar day across years)
  } = req.query

  // SECURITY: family sessions can only read their own family; admins can pick.
  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    // Start with basic query
    let query = supabase
      .from('photos')
      .select('*')
      .eq('family_id', familyId)

    // PRIVATE CONTENT: viewers (read-only role) must never see private posts.
    // Editors and admins see everything. Enforced server-side so the filter
    // cannot be bypassed from the client.
    if (req.auth.role === 'viewer') {
      query = query.eq('is_private', false)
    }

    // Apply non-search filters at database level for performance
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply date range filter
    if (dateStart && dateEnd) {
      query = query.gte('created_at', dateStart).lte('created_at', dateEnd)
    }

    // Age-range filter: translate a months window into a created_at window using
    // the child's birth_date. Uses the given child, else the family's first
    // child with a birth date. Silently no-ops if no birth date is available.
    if (ageMinMonths !== undefined || ageMaxMonths !== undefined) {
      let birthDate = null
      if (childId) {
        const { data: c } = await supabase
          .from('children').select('birth_date, family_id').eq('id', childId).single()
        if (c && c.family_id === familyId) birthDate = c.birth_date
      } else {
        const { data: kids } = await supabase
          .from('children').select('birth_date').eq('family_id', familyId)
          .order('display_order', { ascending: true })
        birthDate = (kids || []).map(k => k.birth_date).find(Boolean) || null
      }
      if (birthDate) {
        const base = new Date(birthDate)
        const minM = parseInt(ageMinMonths)
        const maxM = parseInt(ageMaxMonths)
        if (Number.isFinite(minM)) {
          const d = new Date(base); d.setMonth(d.getMonth() + minM)
          query = query.gte('created_at', d.toISOString())
        }
        if (Number.isFinite(maxM)) {
          const d = new Date(base); d.setMonth(d.getMonth() + maxM)
          query = query.lt('created_at', d.toISOString())
        }
      }
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
      // Get all photo IDs associated with this child — scoped to this family
      const { data: childRow } = await supabase
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .single()

      if (!childRow || childRow.family_id !== familyId) {
        // childId from a foreign family — ignore (return empty filter result)
        filteredData = []
      } else {
        const { data: childPosts, error: childError } = await supabase
          .from('child_posts')
          .select('photo_id')
          .eq('child_id', childId)

        if (childError) {
          console.error('Child posts fetch error:', childError)
        } else {
          const childPhotoIds = childPosts.map(cp => cp.photo_id)
          filteredData = filteredData.filter(photo => childPhotoIds.includes(photo.id))
        }
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

    // "Match any" filters for themed views (Health, Education). A post passes
    // if its category is in categoryAny OR any hashtag is in hashtagsAny.
    const catList = (categoryAny || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const tagList = (hashtagsAny || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (catList.length || tagList.length) {
      filteredData = filteredData.filter(item => {
        const catHit = item.category && catList.includes(String(item.category).toLowerCase())
        const tagHit = Array.isArray(item.hashtags) &&
          item.hashtags.some(tag => tagList.includes(String(tag).toLowerCase()))
        return catHit || tagHit
      })
    }

    // "On This Day": keep only posts whose created_at falls on the given
    // month/day (any year). monthDay format: 'MM-DD'.
    if (monthDay && /^\d{2}-\d{2}$/.test(monthDay)) {
      filteredData = filteredData.filter((item) => {
        const d = new Date(item.created_at)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${mm}-${dd}` === monthDay
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

export default requireAuthOrAdmin(handler)
