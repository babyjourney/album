import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all families with comprehensive data for export
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select(`
        id,
        name,
        phone_number,
        email,
        viewer_pin,
        editor_pin,
        created_at,
        updated_at,
        last_accessed,
        profile_picture_url
      `)
      .order('name')

    if (familiesError) {
      throw familiesError
    }

    const exportData = await Promise.all(
      (families || []).map(async (family) => {
        try {
          // Get children count and names
          const { data: children, error: childrenError } = await supabase
            .from('children')
            .select('name, birth_date')
            .eq('family_id', family.id)
            .order('name')

          // Get photos count
          const { count: photosCount, error: photosCountError } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', family.id)

          // Get latest photo upload date
          const { data: latestPhoto, error: latestPhotoError } = await supabase
            .from('photos')
            .select('created_at')
            .eq('family_id', family.id)
            .order('created_at', { ascending: false })
            .limit(1)

          // Format children names
          const childrenNames = children?.map(child => child.name).join(', ') || 'Fără copii'
          const childrenAges = children?.map(child => {
            if (!child.birth_date) return 'Necunoscut'
            const birthDate = new Date(child.birth_date)
            const today = new Date()
            const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
            return `${age} ani`
          }).join(', ') || 'Necunoscut'

          // Format dates for export
          const formatDate = (dateString) => {
            if (!dateString) return 'Nu este setat'
            return new Date(dateString).toLocaleDateString('ro-RO', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          }

          // Calculate days since last access
          let daysSinceLastAccess = 'Niciodată'
          if (family.last_accessed) {
            const lastAccess = new Date(family.last_accessed)
            const today = new Date()
            const diffTime = today - lastAccess
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            daysSinceLastAccess = diffDays === 1 ? '1 zi' : `${diffDays} zile`
          }

          return {
            'Nume Familie': family.name || 'Fără nume',
            'Număr Telefon': family.phone_number || 'Nu este setat',
            'Email': family.email || 'Nu este setat',
            'PIN Vizualizator': family.viewer_pin || 'Nu este setat',
            'PIN Editor': family.editor_pin || 'Nu este setat',
            'Copii': childrenNames,
            'Numărul Copiilor': children?.length || 0,
            'Vârstele Copiilor': childrenAges,
            'Numărul Fotografiilor': photosCount || 0,
            'Ultima Încărcare Fotografie': latestPhoto?.[0]?.created_at ? formatDate(latestPhoto[0].created_at) : 'Niciodată',
            'Data Creării Contului': formatDate(family.created_at),
            'Ultima Accesare Album': family.last_accessed ? formatDate(family.last_accessed) : 'Niciodată',
            'Zile De La Ultima Accesare': daysSinceLastAccess,
            'Are Poză Profil': family.profile_picture_url ? 'Da' : 'Nu',
            'URL Poză Profil': family.profile_picture_url || 'Nu este setat',
            'ID Familie': family.id
          }
        } catch (familyError) {
          console.error(`Error processing family ${family.id}:`, familyError)
          return {
            'Nume Familie': family.name || 'Fără nume',
            'Număr Telefon': family.phone_number || 'Nu este setat',
            'Email': 'Eroare la încărcare',
            'PIN Vizualizator': family.viewer_pin || 'Nu este setat',
            'PIN Editor': family.editor_pin || 'Nu este setat',
            'Copii': 'Eroare la încărcare',
            'Numărul Copiilor': 0,
            'Vârstele Copiilor': 'Eroare la încărcare',
            'Numărul Fotografiilor': 0,
            'Ultima Încărcare Fotografie': 'Eroare la încărcare',
            'Data Creării Contului': formatDate(family.created_at),
            'Ultima Accesare Album': 'Eroare la încărcare',
            'Zile De La Ultima Accesare': 'Eroare',
            'Are Poză Profil': 'Necunoscut',
            'URL Poză Profil': 'Eroare la încărcare',
            'ID Familie': family.id
          }
        }
      })
    )

    // Add summary statistics at the end
    const summary = {
      'Nume Familie': '=== STATISTICI GENERALE ===',
      'Număr Telefon': `Total familii: ${families.length}`,
      'Email': `Familii cu email: ${families.filter(f => f.email).length}`,
      'PIN Vizualizator': `Familii cu telefon: ${families.filter(f => f.phone_number).length}`,
      'PIN Editor': `Export generat la: ${new Date().toLocaleDateString('ro-RO', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      })}`,
      'Copii': '',
      'Numărul Copiilor': '',
      'Vârstele Copiilor': '',
      'Numărul Fotografiilor': '',
      'Ultima Încărcare Fotografie': '',
      'Data Creării Contului': '',
      'Ultima Accesare Album': '',
      'Zile De La Ultima Accesare': '',
      'Are Poză Profil': '',
      'URL Poză Profil': '',
      'ID Familie': ''
    }

    exportData.push(summary)

    res.status(200).json({
      success: true,
      exportData,
      message: `Export reușit pentru ${families.length} familii`
    })

  } catch (error) {
    console.error('Export data error:', error)
    res.status(500).json({
      error: 'Eroare la exportarea datelor',
      details: error.message
    })
  }
}