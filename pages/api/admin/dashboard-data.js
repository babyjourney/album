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

// Which column represents "when was this actually posted".
//
// `created_at` is the MEMORY date — /api/posts/create-multi overwrites it with
// the date the user picked, so a 2019 photo uploaded last week has
// created_at = 2019. Reading it here made active families show as 💀 dead with
// "0 posts in 30 days". `uploaded_at` is stamped on insert and never rewritten.
//
// Probed once per request so the dashboard keeps working on a deployment where
// sql/sergiu_batch2.sql hasn't been run yet (it just reverts to the old,
// wrong-but-not-broken behaviour instead of 500ing).
async function resolveActivityColumn() {
  const { error } = await supabase.from('photos').select('uploaded_at').limit(1)
  return error ? 'created_at' : 'uploaded_at'
}

// (Item 7) Real per-file byte sizes, recorded at upload. Historical rows don't
// have them, so those still fall back to the old flat estimate.
async function hasFileSizes() {
  const { error } = await supabase.from('photos').select('file_sizes').limit(1)
  return !error
}

const ESTIMATED_BYTES_PER_FILE = 2 * 1024 * 1024

// Bytes a post occupies. Measured when we have the sizes; estimated when we
// don't. NEVER a flat 2MB for a 12MB video — that's what made the admin storage
// figure fiction.
const bytesOfPost = (photo) => {
  const sizes = Array.isArray(photo.file_sizes)
    ? photo.file_sizes
    : (typeof photo.file_sizes === 'string'
        ? (() => { try { const p = JSON.parse(photo.file_sizes); return Array.isArray(p) ? p : null } catch { return null } })()
        : null)

  const fileCount = Array.isArray(photo.file_urls)
    ? photo.file_urls.length
    : (photo.file_url ? 1 : 0)

  if (!fileCount) return 0   // text post

  let total = 0
  for (let i = 0; i < fileCount; i++) {
    const n = sizes ? Number(sizes[i]) : NaN
    total += Number.isFinite(n) && n > 0 ? n : ESTIMATED_BYTES_PER_FILE
  }
  return total
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

    const ACTIVITY_COL = await resolveActivityColumn()
    // Prefix for the select list — empty when the column isn't there yet.
    const SIZES_COL = (await hasFileSizes()) ? 'file_sizes, ' : ''
    // Fall back to created_at per-row too: rows inserted before the migration
    // are backfilled, but a row written by an older deploy could still be null.
    const postedAt = (row) => row[ACTIVITY_COL] || row.created_at

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
          .select(SIZES_COL + `created_at, ${ACTIVITY_COL}, file_url, file_urls`, { count: 'exact' })
          .eq('family_id', family.id)
          .order(ACTIVITY_COL, { ascending: false })

        let storageUsed = 0
        let postsLast30Days = 0
        let photoFilesCount = 0
        if (photosData && photosData.length > 0) {
          photosData.forEach(photo => {
            storageUsed += bytesOfPost(photo)
            if (photo.file_urls && Array.isArray(photo.file_urls)) {
              photoFilesCount += photo.file_urls.length
            } else if (photo.file_url) {
              photoFilesCount += 1
            }
            // (text posts have neither file_url nor file_urls → not counted)
            if (new Date(postedAt(photo)) >= thirtyDaysAgo) postsLast30Days += 1
          })
        }

        const lastPostDate = photosData && photosData.length > 0 ? postedAt(photosData[0]) : null

        let daysSinceLastPost = null
        if (lastPostDate) {
          const lastPost = new Date(lastPostDate)
          // Clamp to >= 0 so a post with a future custom date never reads as
          // "old" (negative age would otherwise misclassify activity).
          daysSinceLastPost = Math.max(0, Math.ceil((now - lastPost) / (1000 * 60 * 60 * 24)))
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
          photo_files_count: photoFilesCount,
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
      .select(`id, title, description, created_at, ${ACTIVITY_COL}, family_id, families!inner(name)`)
      .order(ACTIVITY_COL, { ascending: false })
      .limit(10)

    const formattedActivity = (recentActivity || []).map(photo => ({
      description: `Fotografie nouă: ${photo.title || photo.description?.substring(0, 50) + '...' || 'Fără titlu'}`,
      family_name: photo.families?.name || 'Familie necunoscută',
      timestamp: postedAt(photo),
    }))

    const estimatedStoragePerPhoto = 2 * 1024 * 1024
    // 5b: sum the correctly-computed per-family storage (accounts for
    // multi-photo posts) instead of totalPhotos * 2MB, which ignored them.
    const estimatedStorageUsed = familiesWithStats.reduce((s, f) => s + (f.storage_used || 0), 0)
    // 5d: real photo count = sum of actual media files across all posts
    // (multi-photo posts count each file; text posts count zero).
    const totalPhotoFiles = familiesWithStats.reduce((s, f) => s + (f.photo_files_count || 0), 0)

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
      .select(SIZES_COL + `created_at, ${ACTIVITY_COL}, file_url, file_urls`)
      .gte(ACTIVITY_COL, thirtyDaysAgo.toISOString())

    const { count: olderPhotosCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .lt(ACTIVITY_COL, thirtyDaysAgo.toISOString())

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
      const day = new Date(postedAt(p)).toISOString().slice(0, 10)
      if (!dayBytesDelta.has(day)) dayBytesDelta.set(day, 0)
      dayBytesDelta.set(day, dayBytesDelta.get(day) + bytesOfPost(p))
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
      totalPhotos: totalPhotoFiles,
      totalPosts: totalPhotos || 0,
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
