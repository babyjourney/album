import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

// Activity status thresholds (days since last post).
// 🔥 very active  : posted within VERY_ACTIVE_DAYS
// 🙂 active       : posted within ACTIVE_DAYS
// 😴 sleeping     : no post in the last SLEEPING_DAYS
// 💀 dead         : no post in the last DEAD_DAYS  (or no posts at all and the
//                   account is older than DEAD_DAYS)
const VERY_ACTIVE_DAYS = 7
const ACTIVE_DAYS = 30
const SLEEPING_DAYS = 30
const DEAD_DAYS = 90

function classifyActivity({ daysSinceLastPost, photosCount, accountAgeDays }) {
  // Brand-new families (< 7d old) with no posts are "active" by default —
  // they haven't had time to go silent yet.
  if (photosCount === 0) {
    if (accountAgeDays !== null && accountAgeDays < VERY_ACTIVE_DAYS) {
      return { emoji: '🙂', code: 'active', rank: 2 }
    }
    if (accountAgeDays !== null && accountAgeDays >= DEAD_DAYS) {
      return { emoji: '💀', code: 'dead', rank: 0 }
    }
    return { emoji: '😴', code: 'sleeping', rank: 1 }
  }
  if (daysSinceLastPost === null) {
    return { emoji: '😴', code: 'sleeping', rank: 1 }
  }
  if (daysSinceLastPost <= VERY_ACTIVE_DAYS) {
    return { emoji: '🔥', code: 'very_active', rank: 3 }
  }
  if (daysSinceLastPost <= ACTIVE_DAYS) {
    return { emoji: '🙂', code: 'active', rank: 2 }
  }
  if (daysSinceLastPost <= DEAD_DAYS) {
    return { emoji: '😴', code: 'sleeping', rank: 1 }
  }
  return { emoji: '💀', code: 'dead', rank: 0 }
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // ─── totals ───────────────────────────────────────────────────────────
    const { count: totalFamilies } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true })

    const { count: totalChildren } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })

    const { count: totalPhotos } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })

    // ─── families list ────────────────────────────────────────────────────
    const { data: familiesList } = await supabase
      .from('families')
      .select('id, name, phone_number, created_at, last_accessed, is_suspended, package, email')
      .order('created_at', { ascending: false })

    // Per-family stats (children, photos, posts in last 30d, storage estimate)
    const familiesWithStats = await Promise.all(
      (familiesList || []).map(async (family) => {
        const { count: childrenCount } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', family.id)

        const { data: photosData, count: photosCount } = await supabase
          .from('photos')
          .select('created_at, file_url, file_urls', { count: 'exact' })
          .eq('family_id', family.id)
          .order('created_at', { ascending: false })

        let storageUsed = 0
        let postsLast30Days = 0
        if (photosData && photosData.length > 0) {
          photosData.forEach(photo => {
            if (photo.file_urls && Array.isArray(photo.file_urls)) {
              storageUsed += photo.file_urls.length * 2 * 1024 * 1024
            } else if (photo.file_url) {
              storageUsed += 2 * 1024 * 1024
            }
            const createdAt = new Date(photo.created_at)
            if (createdAt >= thirtyDaysAgo) postsLast30Days += 1
          })
        }

        const lastPostDate = photosData && photosData.length > 0 ? photosData[0].created_at : null

        let daysSinceLastPost = null
        if (lastPostDate) {
          const lastPost = new Date(lastPostDate)
          daysSinceLastPost = Math.ceil((now - lastPost) / (1000 * 60 * 60 * 24))
        }

        const accountAgeDays = family.created_at
          ? Math.ceil((now - new Date(family.created_at)) / (1000 * 60 * 60 * 24))
          : null

        const activity = classifyActivity({
          daysSinceLastPost,
          photosCount: photosCount || 0,
          accountAgeDays,
        })

        return {
          ...family,
          children_count: childrenCount || 0,
          photos_count: photosCount || 0,
          storage_used: storageUsed,
          last_post_date: lastPostDate,
          days_since_last_post: daysSinceLastPost,
          posts_last_30d: postsLast30Days,
          activity_emoji: activity.emoji,
          activity_code: activity.code,
          activity_rank: activity.rank,
          account_age_days: accountAgeDays,
        }
      })
    )

    // ─── recent activity feed ─────────────────────────────────────────────
    const { data: recentActivity } = await supabase
      .from('photos')
      .select('id, title, description, created_at, family_id, families!inner(name)')
      .order('created_at', { ascending: false })
      .limit(10)

    const formattedActivity = (recentActivity || []).map(photo => ({
      description: `Fotografie nouă: ${photo.title || photo.description?.substring(0, 50) + '...' || 'Fără titlu'}`,
      family_name: photo.families?.name || 'Familie necunoscută',
      timestamp: photo.created_at,
    }))

    const estimatedStoragePerPhoto = 2 * 1024 * 1024
    const estimatedStorageUsed = (totalPhotos || 0) * estimatedStoragePerPhoto

    // ─── growth analytics ─────────────────────────────────────────────────
    // New families per day for the last 30 days. We compute this client-side
    // from the families list (already loaded above) to avoid an extra query.
    const newFamiliesPerDay = []
    {
      const buckets = new Map()
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now)
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() - i)
        const key = day.toISOString().slice(0, 10)
        buckets.set(key, 0)
      }
      ;(familiesList || []).forEach(f => {
        if (!f.created_at) return
        const key = new Date(f.created_at).toISOString().slice(0, 10)
        if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1)
      })
      buckets.forEach((count, day) => newFamiliesPerDay.push({ day, count }))
    }

    // Cumulative family count over the last 30 days (running total).
    const familyGrowth = []
    {
      const sortedFamilies = (familiesList || []).slice().sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      )
      const totalBefore30 = sortedFamilies.filter(
        f => f.created_at && new Date(f.created_at) < thirtyDaysAgo
      ).length
      let running = totalBefore30
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now)
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() - i)
        const key = day.toISOString().slice(0, 10)
        // count families created on or before this day, after the baseline
        running = sortedFamilies.filter(f => {
          if (!f.created_at) return false
          const d = new Date(f.created_at)
          d.setHours(0, 0, 0, 0)
          return d.toISOString().slice(0, 10) <= key
        }).length
        familyGrowth.push({ day, total: running })
      }
    }

    // Storage growth per day for the last 30 days (approx: 2MB per photo).
    // We fetch only photo rows from the last 30 days plus a count of all
    // older photos to seed the baseline.
    const { data: recentPhotosForGrowth } = await supabase
      .from('photos')
      .select('created_at, file_url, file_urls')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: olderPhotosCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', thirtyDaysAgo.toISOString())

    const photoBytesAt = new Map()
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now)
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      photoBytesAt.set(day.toISOString().slice(0, 10), 0)
    }

    const baselineBytes = (olderPhotosCount || 0) * estimatedStoragePerPhoto

    // For each recent photo, accumulate bytes into its day. Then we'll
    // convert to a running total.
    const dayBytesDelta = new Map()
    ;(recentPhotosForGrowth || []).forEach(p => {
      const day = new Date(p.created_at).toISOString().slice(0, 10)
      if (!dayBytesDelta.has(day)) dayBytesDelta.set(day, 0)
      const bytes = Array.isArray(p.file_urls)
        ? p.file_urls.length * estimatedStoragePerPhoto
        : (p.file_url ? estimatedStoragePerPhoto : 0)
      dayBytesDelta.set(day, dayBytesDelta.get(day) + bytes)
    })

    const storageGrowth = []
    {
      let running = baselineBytes
      const sortedDays = Array.from(photoBytesAt.keys()).sort()
      sortedDays.forEach(day => {
        running += dayBytesDelta.get(day) || 0
        storageGrowth.push({ day, bytes: running })
      })
    }

    // Daily Active Users (DAU) — based on `last_accessed`. Counts how many
    // families had any access activity per day in the last 30 days. Best
    // effort: last_accessed is a single timestamp, so a family with multiple
    // accesses is only counted for the LAST day. Acceptable for trend.
    const dailyActiveUsers = []
    {
      const dauBuckets = new Map()
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now)
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() - i)
        dauBuckets.set(day.toISOString().slice(0, 10), 0)
      }
      ;(familiesList || []).forEach(f => {
        if (!f.last_accessed) return
        if (f.last_accessed === f.created_at) return // never-accessed sentinel
        const key = new Date(f.last_accessed).toISOString().slice(0, 10)
        if (dauBuckets.has(key)) dauBuckets.set(key, dauBuckets.get(key) + 1)
      })
      dauBuckets.forEach((count, day) => dailyActiveUsers.push({ day, count }))
    }

    // Retention rate (30d) — % of families that have created a post within
    // the last 30 days. A blunt metric, but a useful trendline for now.
    let retentionRate = 0
    if ((totalFamilies || 0) > 0) {
      const activeFamilies = familiesWithStats.filter(f => f.posts_last_30d > 0).length
      retentionRate = Math.round((activeFamilies / totalFamilies) * 100)
    }

    // Totals for the analytics summary card
    const newFamiliesLast30d = newFamiliesPerDay.reduce((s, d) => s + d.count, 0)
    const newFamiliesLast7d = familiesWithStats.filter(f =>
      f.created_at && new Date(f.created_at) >= sevenDaysAgo
    ).length
    const dauToday = (familiesList || []).filter(f =>
      f.last_accessed && f.last_accessed !== f.created_at && new Date(f.last_accessed) >= oneDayAgo
    ).length

    res.status(200).json({
      totalFamilies: totalFamilies || 0,
      totalChildren: totalChildren || 0,
      totalPhotos: totalPhotos || 0,
      storageUsed: estimatedStorageUsed,
      familiesList: familiesWithStats,
      recentActivity: formattedActivity,
      analytics: {
        newFamiliesPerDay,
        familyGrowth,
        storageGrowth,
        dailyActiveUsers,
        retentionRate,
        newFamiliesLast30d,
        newFamiliesLast7d,
        dauToday,
      },
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    res.status(500).json({
      error: 'Eroare la încărcarea datelor dashboard-ului',
      details: error.message,
    })
  }
}

export default requireAdmin(handler)
