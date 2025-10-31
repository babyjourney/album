import { supabase } from '../../../lib/supabaseClient'
import { requireEditor, verifyFamilyOwnership } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { photoId, fileUrl } = req.body

  if (!photoId) {
    return res.status(400).json({ error: 'ID-ul fotografiei este obligatoriu' })
  }

  try {
    // Verify the photo belongs to the authenticated family
    const ownershipCheck = await verifyFamilyOwnership(req.auth.familyId, 'photos', photoId)
    
    if (!ownershipCheck.isOwner) {
      return res.status(403).json({ 
        error: ownershipCheck.error || 'Nu aveți permisiunea să ștergeți această fotografie',
        code: 'FORBIDDEN'
      })
    }

    // Delete from database - now with family verification
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('family_id', req.auth.familyId) // Double-check family ownership

    if (dbError) {
      throw dbError
    }

    // Delete from storage if fileUrl provided
    if (fileUrl) {
      try {
        const urlParts = fileUrl.split('/')
        const filePath = urlParts.slice(-2).join('/')
        
        await supabase.storage
          .from('album_uploads')
          .remove([filePath])
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Don't fail the entire operation if storage deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Fotografia a fost ștearsă cu succes'
    })

  } catch (error) {
    console.error('Photo delete error:', error)
    return res.status(500).json({ error: 'Ștergerea fotografiei a eșuat' })
  }
}

// Export with authentication middleware
export default requireEditor(handler)