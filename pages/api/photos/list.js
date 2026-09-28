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
    dateAnchor,
    tzOffset,
    childId,
    ageMinMonths,
    ageMaxMonths,
    categoryAny,
    hashtagsAny,
    matchMode,
    monthDay
  } = req.query

  const anyMode = matchMode === 'any'

  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu' })
  }

  try {
    let query = supabase
      .from('photos')
      .select('*')
      .eq('family_id', familyId)

    if (req.auth.role === 'viewer') {
      query = query.eq('is_private', false)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (dateStart && dateEnd && !anyMode) {
      query = query.gte('created_at', dateStart).lte('created_at', dateEnd)
    }

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

    query = query.order('created_at', { ascending: sort === 'oldest' })

    const { data, error } = await query

    if (error) {
      throw error
    }

    let filteredData = data || []

    if (childId) {
      const { data: childRow } = await supabase
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .single()

      if (!childRow || childRow.family_id !== familyId) {
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

    if (search) {
      if (search.startsWith('#')) {
        const hashtagValue = search.substring(1)
        filteredData = filteredData.filter(item => {
          if (!item.hashtags || !Array.isArray(item.hashtags)) return false
          return item.hashtags.some(tag => matchesSearch(tag, hashtagValue))
        })
      } else {
        filteredData = filteredData.filter(item => {
          const titleMatch = matchesSearch(item.title || '', search)
          const descriptionMatch = matchesSearch(item.description || '', search)

          let hashtagMatch = false
          if (item.hashtags && Array.isArray(item.hashtags)) {
            hashtagMatch = item.hashtags.some(tag => matchesSearch(tag, search))
          }

          return titleMatch || descriptionMatch || hashtagMatch
        })
      }
    }

    if (hashtag) {
      filteredData = filteredData.filter(item => {
        if (!item.hashtags || !Array.isArray(item.hashtags)) return false
        return item.hashtags.some(tag => matchesSearch(tag, hashtag))
      })
    }

    const catList = (categoryAny || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const tagList = (hashtagsAny || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    const matchesCatOrTag = (item) => {
      const catHit = item.category && catList.includes(String(item.category).toLowerCase())
      const tagHit = Array.isArray(item.hashtags) &&
        item.hashtags.some(tag => tagList.includes(String(tag).toLowerCase()))
      return catHit || tagHit
    }

    if (anyMode && (dateStart || dateEnd || catList.length || tagList.length)) {
      const start = dateStart ? new Date(dateStart).getTime() : -Infinity
      const end = dateEnd ? new Date(dateEnd).getTime() : Infinity
      const hasRange = Boolean(dateStart || dateEnd)
      const hasTags = catList.length > 0 || tagList.length > 0

      filteredData = filteredData.filter((item) => {
        const t = new Date(item.created_at).getTime()
        const inRange = hasRange && t >= start && t <= end
        const tagged = hasTags && matchesCatOrTag(item)
        return inRange || tagged
      })
    } else if (anyMode) {
      console.warn('photos/list: matchMode=any with no dates, categories or hashtags — returning empty.')
      filteredData = []
    } else if (catList.length || tagList.length) {
      filteredData = filteredData.filter(matchesCatOrTag)
    }

    if (monthDay && /^\d{2}-\d{2}$/.test(monthDay)) {
      filteredData = filteredData.filter((item) => {
        const d = new Date(item.created_at)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${mm}-${dd}` === monthDay
      })
    }

    if (dateAnchor && /^\d{4}-\d{2}-\d{2}$/.test(dateAnchor)) {
      const offsetMinutes = Number.isFinite(parseInt(tzOffset, 10)) ? parseInt(tzOffset, 10) : 0
      const dayStart = new Date(`${dateAnchor}T00:00:00.000Z`).getTime() + offsetMinutes * 60_000
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const chronological = [...filteredData].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )

      const before = []
      const onDay = []
      const after = []
      for (const post of chronological) {
        const t = new Date(post.created_at).getTime()
        if (t < dayStart) before.push(post)
        else if (t < dayEnd) onDay.push(post)
        else after.push(post)
      }

      filteredData = [
        ...before.slice(-3),
        ...onDay,
        ...after.slice(0, 3),
      ]

      if (sort !== 'oldest') filteredData.reverse()
    }

    if (sort === 'title_asc' || sort === 'title_desc') {
      const dir = sort === 'title_asc' ? 1 : -1
      filteredData = [...filteredData].sort((a, b) => {
        const at = (a.title || '').trim()
        const bt = (b.title || '').trim()
        if (!at && !bt) return 0
        if (!at) return 1
        if (!bt) return -1
        return dir * at.localeCompare(bt, 'ro', { sensitivity: 'base', numeric: true })
      })
    }

    return res.status(200).json({
      success: true,
      photos: filteredData
    })

  } catch (error) {
    console.error('Photos fetch error:', error)
    return res.status(500).json({ error: 'Încărcarea fotografiilor a eșuat', errorKey: 'errPhotosLoadFailed' })
  }
}

export default requireAuthOrAdmin(handler)
