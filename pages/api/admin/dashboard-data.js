import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get total families
    const { count: totalFamilies, error: familiesError } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true })

    if (familiesError) {
      console.error('Error counting families:', familiesError)
    }

    // Get total children
    const { count: totalChildren, error: childrenError } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })

    if (childrenError) {
      console.error('Error counting children:', childrenError)
    }

    // Get total photos
    const { count: totalPhotos, error: photosError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })

    if (photosError) {
      console.error('Error counting photos:', photosError)
    }

    // Get families list with details
    const { data: familiesList, error: familiesListError } = await supabase
      .from('families')
      .select(`
        id,
        name,
        phone_number,
        created_at,
        last_accessed,
        is_suspended,
        package
      `)
      .order('created_at', { ascending: false })

    if (familiesListError) {
      console.error('Error fetching families list:', familiesListError)
    }

    // Get children count, photos count, and storage info for each family
    const familiesWithStats = await Promise.all(
      (familiesList || []).map(async (family) => {
        // Get children count
        const { count: childrenCount } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', family.id)

        // Get photos count and last post date
        const { data: photosData, count: photosCount } = await supabase
          .from('photos')
          .select('created_at, file_url, file_urls', { count: 'exact' })
          .eq('family_id', family.id)
          .order('created_at', { ascending: false })

        // Calculate storage usage for this family
        let storageUsed = 0
        if (photosData && photosData.length > 0) {
          // Estimate storage based on number of photos
          // For single photos: ~2MB average
          // For multi-photos: count files in file_urls array
          photosData.forEach(photo => {
            if (photo.file_urls && Array.isArray(photo.file_urls)) {
              // Multi-photo post
              storageUsed += photo.file_urls.length * 2 * 1024 * 1024 // 2MB per photo
            } else if (photo.file_url) {
              // Single photo
              storageUsed += 2 * 1024 * 1024 // 2MB
            }
          })
        }

        // Get last post date
        const lastPostDate = photosData && photosData.length > 0 ? photosData[0].created_at : null

        // Calculate days since last post
        let daysSinceLastPost = null
        if (lastPostDate) {
          const lastPost = new Date(lastPostDate)
          const today = new Date()
          const diffTime = today - lastPost
          daysSinceLastPost = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        return {
          ...family,
          children_count: childrenCount || 0,
          photos_count: photosCount || 0,
          storage_used: storageUsed,
          last_post_date: lastPostDate,
          days_since_last_post: daysSinceLastPost
        }
      })
    )

    // Get recent activity (last 10 photo uploads)
    const { data: recentActivity, error: activityError } = await supabase
      .from('photos')
      .select(`
        id,
        title,
        description,
        created_at,
        family_id,
        families!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    const formattedActivity = (recentActivity || []).map(photo => ({
      description: `Fotografie nouă: ${photo.title || photo.description?.substring(0, 50) + '...' || 'Fără titlu'}`,
      family_name: photo.families?.name || 'Familie necunoscută',
      timestamp: photo.created_at
    }))

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
    }

    // Calculate storage used (rough estimate)
    // This would typically require checking the actual file sizes in storage
    // For now, we'll estimate based on photo count
    const estimatedStoragePerPhoto = 2 * 1024 * 1024 // 2MB per photo average
    const estimatedStorageUsed = (totalPhotos || 0) * estimatedStoragePerPhoto

    res.status(200).json({
      totalFamilies: totalFamilies || 0,
      totalChildren: totalChildren || 0,
      totalPhotos: totalPhotos || 0,
      storageUsed: estimatedStorageUsed,
      familiesList: familiesWithStats,
      recentActivity: formattedActivity
    })

  } catch (error) {
    console.error('Dashboard data error:', error)
    res.status(500).json({
      error: 'Eroare la încărcarea datelor dashboard-ului',
      details: error.message
    })
  }
}

export default requireAdmin(handler)