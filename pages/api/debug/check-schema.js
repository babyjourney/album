import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Test if file_urls column exists
    const { data: testUrls, error: urlsError } = await supabase
      .from('photos')
      .select('file_urls')
      .limit(1)

    // Test if cover_index column exists  
    const { data: testCover, error: coverError } = await supabase
      .from('photos')
      .select('cover_index')
      .limit(1)

    // Test if type column exists
    const { data: testType, error: typeError } = await supabase
      .from('photos')
      .select('type')
      .limit(1)

    res.status(200).json({
      schema_check: {
        file_urls_exists: !urlsError,
        file_urls_error: urlsError?.message,
        cover_index_exists: !coverError,
        cover_index_error: coverError?.message,
        type_exists: !typeError,
        type_error: typeError?.message
      }
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Schema check failed',
      details: error.message 
    })
  }
}