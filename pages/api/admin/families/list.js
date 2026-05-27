// Admin → list of all families with the metadata the management UI needs.
//
// Used by /admin/children when the admin picks which family to manage. We
// include children names + count so the UI can show "Albumul lui {name}"
// labels without N+1 calls.
//
// The full dashboard view uses /api/admin/dashboard-data which is heavier
// (photos counts, storage estimates, activity emoji); this endpoint stays
// focused on identification fields.

import { supabase } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Single round-trip: nested select pulls each family's children with one
  // query (Supabase translates this to a server-side join).
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

  // Enrich with display title to match the previous client-side logic.
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
