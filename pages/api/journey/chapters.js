import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId, canWrite } from '../../../lib/childRecord'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      let q = supabase.from('life_chapters').select('*').eq('family_id', familyId)
      if (childId) q = q.eq('child_id', childId)
      const { data, error } = await q
        .order('display_order', { ascending: true })
        .order('start_date', { ascending: true })
      if (error) throw error
      return res.status(200).json({ success: true, chapters: data || [] })
    }

    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor', errorKey: 'errEditorRole' })
      const { childId, title, description, hashtags, color, startDate, endDate, displayOrder } = req.body || {}
      if (!title || !title.trim()) return res.status(400).json({ error: 'Titlul este obligatoriu', errorKey: 'errTitleRequired' })

      const tagList = (Array.isArray(hashtags) ? hashtags : String(hashtags || '').split(/[\s,]+/))
        .map((t) => String(t).trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 10)

      const payload = {
        family_id: familyId,
        child_id: childId || null,
        title: title.trim(),
        color: color || '#7c3aed',
        start_date: startDate || null,
        end_date: endDate || null,
        display_order: displayOrder || 0,
        description: (description || '').trim(),
        hashtags: tagList.length ? tagList : null,
      }

      let { data, error } = await supabase
        .from('life_chapters').insert(payload).select().single()

      let warning = null
      if (error && /description|hashtags/i.test(error.message || '')) {
        console.warn('life_chapters missing description/hashtags — run supabase-migration.sql')
        const { description: _d, hashtags: _h, ...legacy } = payload
        ;({ data, error } = await supabase
          .from('life_chapters').insert(legacy).select().single())
        if (!error && (payload.description || payload.hashtags)) warning = 'chapterFieldsDroppedWarning'
      }

      if (error) throw error
      return res.status(200).json({ success: true, chapter: data, warning })
    }

    if (req.method === 'DELETE') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor', errorKey: 'errEditorRole' })
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'id lipsește', errorKey: 'errIdRequired' })
      const { error } = await supabase
        .from('life_chapters').delete().eq('id', id).eq('family_id', familyId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('chapters api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(requireFeature('lifeChapters', handler))
