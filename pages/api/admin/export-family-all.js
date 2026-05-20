import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { familyId } = req.query
  if (!familyId) return res.status(400).json({ error: 'familyId required' })

  try {
    const { data: family } = await supabase
      .from('families')
      .select('id, name, created_at, phone_number, email, profile_picture_url')
      .eq('id', familyId)
      .single()

    const { data: children } = await supabase
      .from('children')
      .select('id, name, birth_date, profile_picture_url')
      .eq('family_id', familyId)
      .order('display_order')

    const { data: photos } = await supabase
      .from('photos')
      .select('id, title, description, file_url, file_urls, file_type, type, hashtags, category, cover_index, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    const photosWithChildren = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data: childPosts } = await supabase
          .from('child_posts')
          .select('children(name)')
          .eq('photo_id', photo.id)
        return {
          ...photo,
          tagged_children: childPosts?.map(cp => cp.children?.name).filter(Boolean) || []
        }
      })
    )

    const exportData = {
      export_date: new Date().toISOString(),
      family,
      children: children || [],
      total_posts: photos?.length || 0,
      posts: photosWithChildren
    }

    res.setHeader('Content-Disposition', `attachment; filename="${family?.name || 'family'}-export-complet.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(exportData)
  } catch (error) {
    console.error('Export family all error:', error)
    res.status(500).json({ error: 'Eroare la export', details: error.message })
  }
}

export default requireAdmin(handler)
