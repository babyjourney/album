import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple auth check
  const { username, password } = req.body
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('Testing multi-photo post creation...')

    // Test data
    const testUrls = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg', 
      'https://example.com/photo3.jpg'
    ]

    const testData = {
      family_id: '1', // Assuming family_id 1 exists
      title: 'Test Multi-Photo Post',
      description: 'Testing multi-photo functionality',
      type: 'multi-photo',
      file_url: testUrls[0], // Primary URL
      file_type: 'image'
    }

    // First try: Test if file_urls column exists
    try {
      const newSchemaData = {
        ...testData,
        file_urls: testUrls,
        cover_index: 1 // Test cover selection
      }
      
      const { data: post, error: postError } = await supabase
        .from('photos')
        .insert(newSchemaData)
        .select()
        .single()

      if (postError) {
        console.error('New schema test failed:', postError)
        
        if (postError.message && postError.message.includes('column')) {
          return res.json({
            success: false,
            schema: 'new_schema_missing',
            error: postError.message,
            message: 'file_urls column does not exist. Manual database migration needed.',
            sql_needed: `
-- Run this SQL in your Supabase SQL editor:
ALTER TABLE photos ADD COLUMN file_urls JSONB;
ALTER TABLE photos ADD COLUMN cover_index INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_photos_file_urls ON photos USING GIN (file_urls);
COMMENT ON COLUMN photos.file_urls IS 'JSON array of file URLs for multi-photo posts';
COMMENT ON COLUMN photos.cover_index IS 'Index of the photo in file_urls array to use as cover/thumbnail';
            `
          })
        }
        
        throw postError
      }

      // Success with new schema
      console.log('New schema works! Post created:', post)
      
      // Clean up test post
      await supabase.from('photos').delete().eq('id', post.id)
      
      return res.json({
        success: true,
        schema: 'new_schema_works',
        message: 'file_urls column exists and works correctly',
        test_post: post
      })

    } catch (schemaError) {
      console.log('New schema failed, testing fallback...')
      
      // Second try: Test fallback schema
      try {
        const fallbackData = {
          ...testData,
          description: testData.description + '\n__MULTI_PHOTO_URLS__:' + JSON.stringify(testUrls) + '\n__COVER_INDEX__:1'
        }
        
        const { data: post, error: postError } = await supabase
          .from('photos')
          .insert(fallbackData)
          .select()
          .single()

        if (postError) {
          throw postError
        }

        console.log('Fallback schema works! Post created:', post)
        
        // Clean up test post
        await supabase.from('photos').delete().eq('id', post.id)
        
        return res.json({
          success: true,
          schema: 'fallback_schema_works',
          message: 'Using old fallback schema (URLs in description). Consider adding file_urls column.',
          test_post: post
        })

      } catch (fallbackError) {
        console.error('Both schemas failed:', fallbackError)
        
        return res.json({
          success: false,
          schema: 'all_failed',
          error: fallbackError.message,
          message: 'Both new and fallback schemas failed. Check database permissions.'
        })
      }
    }

  } catch (error) {
    console.error('Test error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Test failed with unexpected error'
    })
  }
}