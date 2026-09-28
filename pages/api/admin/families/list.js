import { supabase } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data, error } = await supabase
    .from('families')
    .select(`
      id, name, phone_number, email, package, is_suspended, require_otp_login,
      profile_picture_url, created_at,
      children ( id, name, birth_date, display_order )
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('admin/families/list failed:', error)
    return res.status(500).json({ error: error.message })
  }

  const families = (data || []).map((f) => {
    const childrenList = Array.isArray(f.children) ? f.children : []
    const childrenCount = childrenList.length
    let displayTitle
    if (childrenCount === 1) {
      displayTitle = `Albumul lui ${childrenList[0].name}`
    } else {
      displayTitle = `Albumul familiei ${f.name}`
    }
    return {
      ...f,
      children: childrenList,
      childrenCount,
      displayTitle,
      phoneDisplay: f.phone_number || 'Fără telefon',
    }
  })

  return res.status(200).json({ ok: true, families })
}

export default requireAdmin(handler)
