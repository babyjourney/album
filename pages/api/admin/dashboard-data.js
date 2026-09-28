import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { postedAt, lastTouchedAt, fileUrlsOf } from '../../../lib/postTimestamps'

const VERY_ACTIVE_DAYS = 7
const ACTIVE_DAYS = 30
const SLEEPING_DAYS = 30
const DEAD_DAYS = 90

function classifyActivity({ daysSinceLastPost, photosCount, accountAgeDays }) {
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

async function probeOptionalColumns() {
  const probe = async (col) => {
    const { error } = await supabase.from('photos').select(col).limit(1)
    return !error
  }
  const [uploadedAt, fileSizes] = await Promise.all([probe('uploaded_at'), probe('file_sizes')])
  return { uploadedAt, fileSizes }
}

async function fetchAllRows(buildQuery) {
  const PAGE = 1000
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) throw error
    const rows = data || []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

const ESTIMATED_BYTES_PER_FILE = 2 * 1024 * 1024

const bytesOfPost = (photo) => {
  const sizes = Array.isArray(photo.file_sizes)
    ? photo.file_sizes
    : (typeof photo.file_sizes === 'string'
        ? (() => { try { const p = JSON.parse(photo.file_sizes); return Array.isArray(p) ? p : null } catch { return null } })()
        : null)

  const fileCount = fileUrlsOf(photo).length
  if (!fileCount) return 0

  let total = 0
  for (let i = 0; i < fileCount; i++) {
    const n = sizes ? Number(sizes[i]) : NaN
    total += Number.isFinite(n) && n > 0 ? n : ESTIMATED_BYTES_PER_FILE
  }
  return total
}

const dayKey = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
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

    const cols = await probeOptionalColumns()
    const photoSelect = [
      'id', 'family_id', 'title', 'description',
      'created_at', 'updated_at', 'file_url', 'file_urls',
      cols.uploadedAt ? 'uploaded_at' : null,
      cols.fileSizes ? 'file_sizes' : null,
    ].filter(Boolean).join(', ')

    const [{ data: familiesList }, allPhotos, { count: totalChildren }] = await Promise.all([
      supabase
        .from('families')
        .select('id, name, phone_number, created_at, last_accessed, is_suspended, package, email')
        .order('created_at', { ascending: false }),
      fetchAllRows(() => supabase.from('photos').select(photoSelect).order('id', { ascending: true })),
      supabase.from('children').select('*', { count: 'exact', head: true }),
    ])

    const { data: childrenRows } = await supabase.from('children').select('family_id')
    const childrenByFamily = new Map()
    ;(childrenRows || []).forEach(c => {
      childrenByFamily.set(c.family_id, (childrenByFamily.get(c.family_id) || 0) + 1)
    })

    const photosByFamily = new Map()
    for (const p of allPhotos) {
      if (!photosByFamily.has(p.family_id)) photosByFamily.set(p.family_id, [])
      photosByFamily.get(p.family_id).push(p)
    }

    const totalFamilies = (familiesList || []).length
    const totalPhotos = allPhotos.length

    const familiesWithStats = (familiesList || []).map((family) => {
      const photosData = photosByFamily.get(family.id) || []
      const photosCount = photosData.length

      let storageUsed = 0
      let postsLast30Days = 0
      let photoFilesCount = 0
      let lastTouched = null
      const postYears = new Set()

      for (const photo of photosData) {
        storageUsed += bytesOfPost(photo)
        photoFilesCount += fileUrlsOf(photo).length
        if (postedAt(photo) >= thirtyDaysAgo) postsLast30Days += 1
        const touched = lastTouchedAt(photo)
        if (!lastTouched || touched > lastTouched) lastTouched = touched
        const y = new Date(photo.created_at).getFullYear()
        if (!Number.isNaN(y)) postYears.add(y)
      }

      const lastPostDate = lastTouched ? lastTouched.toISOString() : null

      let daysSinceLastPost = null
      if (lastTouched) {
        daysSinceLastPost = Math.max(0, Math.ceil((now - lastTouched) / (1000 * 60 * 60 * 24)))
      }

      const accountAgeDays = family.created_at
        ? Math.ceil((now - new Date(family.created_at)) / (1000 * 60 * 60 * 24))
        : null

      const activity = classifyActivity({
        daysSinceLastPost,
        photosCount,
        accountAgeDays,
      })

      return {
        ...family,
        children_count: childrenByFamily.get(family.id) || 0,
        photos_count: photosCount,
        photo_files_count: photoFilesCount,
        storage_used: storageUsed,
        last_post_date: lastPostDate,
        days_since_last_post: daysSinceLastPost,
        posts_last_30d: postsLast30Days,
        activity_emoji: activity.emoji,
        activity_code: activity.code,
        activity_rank: activity.rank,
        account_age_days: accountAgeDays,
        post_years: [...postYears].sort((a, b) => b - a),
      }
    })

    const familyNameById = new Map((familiesList || []).map(f => [f.id, f.name]))
    const formattedActivity = allPhotos
      .map(photo => ({ photo, at: postedAt(photo) }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 10)
      .map(({ photo, at }) => ({
        description: `Fotografie nouă: ${photo.title || (photo.description ? photo.description.substring(0, 50) + '...' : 'Fără titlu')}`,
        family_name: familyNameById.get(photo.family_id) || 'Familie necunoscută',
        timestamp: at.toISOString(),
      }))

    const estimatedStorageUsed = familiesWithStats.reduce((s, f) => s + (f.storage_used || 0), 0)
    const totalPhotoFiles = familiesWithStats.reduce((s, f) => s + (f.photo_files_count || 0), 0)

    const last30Keys = []
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now)
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      last30Keys.push(day.toISOString().slice(0, 10))
    }

    const newFamiliesPerDay = []
    {
      const buckets = new Map(last30Keys.map(k => [k, 0]))
      ;(familiesList || []).forEach(f => {
        if (!f.created_at) return
        const key = new Date(f.created_at).toISOString().slice(0, 10)
        if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1)
      })
      buckets.forEach((count, day) => newFamiliesPerDay.push({ day, count }))
    }

    const familyGrowth = []
    {
      const createdKeys = (familiesList || [])
        .filter(f => f.created_at)
        .map(f => dayKey(f.created_at))
      for (const key of last30Keys) {
        familyGrowth.push({ day: key, total: createdKeys.filter(k => k <= key).length })
      }
    }

    const storageGrowth = []
    {
      let baselineBytes = 0
      const dayBytesDelta = new Map()
      for (const p of allPhotos) {
        const at = postedAt(p)
        const bytes = bytesOfPost(p)
        if (at < thirtyDaysAgo) {
          baselineBytes += bytes
        } else {
          const key = at.toISOString().slice(0, 10)
          dayBytesDelta.set(key, (dayBytesDelta.get(key) || 0) + bytes)
        }
      }
      let running = baselineBytes
      for (const key of last30Keys) {
        running += dayBytesDelta.get(key) || 0
        storageGrowth.push({ day: key, bytes: running })
      }
    }

    const dailyActiveUsers = []
    {
      const dauBuckets = new Map(last30Keys.map(k => [k, 0]))
      ;(familiesList || []).forEach(f => {
        if (!f.last_accessed) return
        if (f.last_accessed === f.created_at) return
        const key = new Date(f.last_accessed).toISOString().slice(0, 10)
        if (dauBuckets.has(key)) dauBuckets.set(key, dauBuckets.get(key) + 1)
      })
      dauBuckets.forEach((count, day) => dailyActiveUsers.push({ day, count }))
    }

    let retentionRate = 0
    if (totalFamilies > 0) {
      const activeFamilies = familiesWithStats.filter(f => f.posts_last_30d > 0).length
      retentionRate = Math.round((activeFamilies / totalFamilies) * 100)
    }

    const newFamiliesLast30d = newFamiliesPerDay.reduce((s, d) => s + d.count, 0)
    const newFamiliesLast7d = familiesWithStats.filter(f =>
      f.created_at && new Date(f.created_at) >= sevenDaysAgo
    ).length
    const dauToday = (familiesList || []).filter(f =>
      f.last_accessed && f.last_accessed !== f.created_at && new Date(f.last_accessed) >= oneDayAgo
    ).length

    res.status(200).json({
      totalFamilies,
      totalChildren: totalChildren || 0,
      totalPhotos: totalPhotoFiles,
      totalPosts: totalPhotos,
      storageUsed: estimatedStorageUsed,
      familiesList: familiesWithStats,
      recentActivity: formattedActivity,
      activitySource: cols.uploadedAt ? 'uploaded_at' : 'storage_path',
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
