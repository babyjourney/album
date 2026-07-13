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
    dateAnchor,     // 'YYYY-MM-DD' — 3 posts before / all of that day / 3 after
    tzOffset,       // client's Date.getTimezoneOffset() (minutes), for dateAnchor
    childId,
    ageMinMonths,   // age-range timeline tabs (Birth/Toddler/School/Teenage)
    ageMaxMonths,
    categoryAny,    // comma list — match any (Health/Education filtered views)
    hashtagsAny,    // comma list — match any hashtag
    matchMode,      // 'any' — OR the date range with categoryAny/hashtagsAny
    monthDay        // 'MM-DD' — "On This Day" (same calendar day across years)
  } = req.query

  // (Item 11) A Journey chapter collects the posts made DURING it plus anything
  // tagged as belonging to it — a christening tagged #botez counts even if it
  // happened two years later. That's an OR, but the default treatment of
  // dateStart/dateEnd is an AND applied in the database, which would drop the
  // out-of-range tagged posts. matchMode=any moves the date test client-side so
  // it can be OR'd with the tag/category test.
  const anyMode = matchMode === 'any'

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

    // Apply date range filter. In anyMode it's evaluated below instead, as one
    // arm of an OR rather than a hard database constraint.
    if (dateStart && dateEnd && !anyMode) {
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

    // Base ordering is always chronological. Alphabetical sorts are applied in
    // JS after filtering (see below) because Postgres orders by raw byte
    // collation — which mis-sorts Romanian diacritics (ă/â/î/ș/ț) and puts
    // NULL titles (text posts) first on DESC. localeCompare gets both right.
    query = query.order('created_at', { ascending: sort === 'oldest' })

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

    const matchesCatOrTag = (item) => {
      const catHit = item.category && catList.includes(String(item.category).toLowerCase())
      const tagHit = Array.isArray(item.hashtags) &&
        item.hashtags.some(tag => tagList.includes(String(tag).toLowerCase()))
      return catHit || tagHit
    }

    if (anyMode && (dateStart || dateEnd || catList.length || tagList.length)) {
      // Chapter membership: inside the date range OR carrying one of its tags.
      //
      // An open-ended range is still a range — treat a missing bound as
      // unbounded rather than as "no range at all". Requiring BOTH bounds meant
      // a caller that passed only dateStart got an empty feed, silently.
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
      // matchMode=any with nothing to match on. Returning the family's entire
      // feed here would look like a bug at the call site, so return nothing and
      // say why.
      console.warn('photos/list: matchMode=any with no dates, categories or hashtags — returning empty.')
      filteredData = []
    } else if (catList.length || tagList.length) {
      filteredData = filteredData.filter(matchesCatOrTag)
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

    // ── Date anchor ───────────────────────────────────────────────────────
    // Picking a calendar date used to filter to a fixed ±5-day window, so if
    // nothing happened that fortnight you got an empty feed. Instead, anchor:
    // show the 3 posts immediately BEFORE the chosen day, every post ON that
    // day, and the 3 immediately AFTER — no matter how far apart they are.
    //
    // Runs after every other filter so the neighbours are the neighbours of
    // what you're actually looking at (this child, this category, ...).
    if (dateAnchor && /^\d{4}-\d{2}-\d{2}$/.test(dateAnchor)) {
      // The date comes from <input type="date"> — the user's LOCAL calendar day.
      // Treating it as a UTC day is wrong for everyone east of Greenwich: in
      // UTC+3, a photo taken at 00:30 on 20 Oct is stored as 19 Oct 21:30Z, so
      // "20 Oct" would push it into `before` and it could be sliced away — even
      // though the feed displays it as 20 Oct.
      //
      // tzOffset is the client's Date.getTimezoneOffset(): minutes to ADD to
      // local time to get UTC (UTC+3 => -180). Falls back to UTC when absent.
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
        ...before.slice(-3),   // 3 closest before the day
        ...onDay,              // the whole day, however many
        ...after.slice(0, 3),  // 3 closest after
      ]

      // The window was assembled oldest-first because that's the only order in
      // which "before" and "after" mean anything. Put it back into the order the
      // user actually asked for. (A title sort, if requested, overrides below.)
      if (sort !== 'oldest') filteredData.reverse()
    }

    // ── Alphabetical sort (item 5) ────────────────────────────────────────
    // Untitled posts always sink to the bottom rather than clumping at the top
    // of Z-A, which is what a raw DESC on a nullable column would do.
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
    return res.status(500).json({ error: 'Încărcarea fotografiilor a eșuat' })
  }
}

export default requireAuthOrAdmin(handler)
