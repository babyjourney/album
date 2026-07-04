// List the distinct hashtags a family has already used, for autocomplete
// suggestions in the upload form and search (item 2).
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metoda nu este permisă' })

  const familyId = req.auth.isAdmin ? (req.query.familyId) : req.auth.familyId
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  try {
    const { data, error } = await supabase
      .from('photos')
      .select('hashtags')
      .eq('family_id', familyId)
      .not('hashtags', 'is', null)
    if (error) throw error

    // Flatten + dedupe (case-insensitive), keep first-seen casing, sort by
    // frequency so the most-used tags surface first.
    const counts = new Map()
    for (const row of data || []) {
      if (!Array.isArray(row.hashtags)) continue
      for (const raw of row.hashtags) {
        const tag = String(raw).replace(/^#/, '').trim()
        if (!tag) continue
        const key = tag.toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }
    const hashtags = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)

    return res.status(200).json({ success: true, hashtags })
  } catch (error) {
    console.error('hashtags list error:', error)
    return res.status(500).json({ error: 'Încărcarea hashtag-urilor a eșuat' })
  }
}

export default requireAuthOrAdmin(handler)
