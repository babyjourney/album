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
    // Test if we can insert with file_urls - this will tell us if the column exists
    console.log('Testing file_urls column...')
    
    const testData = {
      family_id: '00000000-0000-0000-0000-000000000000', // Use a fake UUID that won't conflict
      title: 'Test Multi Photo',
      description: 'Test post to check schema',
      type: 'image',
      file_url: 'https://test.com/test.jpg',
      file_type: 'image',
      file_urls: ['https://test.com/test1.jpg', 'https://test.com/test2.jpg'],
      cover_index: 0
    }

    const { data: post, error: insertError } = await supabase
      .from('photos')
      .insert(testData)
      .select()
      .single()

    if (insertError) {
      console.error('Insert test failed:', insertError.message)
      
      if (insertError.message.includes('column "file_urls" does not exist')) {
        return res.json({
          success: false,
          message: 'file_urls column missing',
          error: insertError.message,
          sql_needed: `
-- Go to your Supabase SQL Editor and run:
ALTER TABLE photos ADD COLUMN file_urls JSONB;
ALTER TABLE photos ADD COLUMN cover_index INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_photos_file_urls ON photos USING GIN (file_urls);
          `
        })
      } else if (insertError.message.includes('column "cover_index" does not exist')) {
        return res.json({
          success: false,
          message: 'cover_index column missing',
          error: insertError.message,
          sql_needed: `
-- Go to your Supabase SQL Editor and run:
ALTER TABLE photos ADD COLUMN cover_index INTEGER DEFAULT 0;
          `
        })
      } else {
        return res.json({
          success: false,
          message: 'Other database error',
          error: insertError.message
        })
      }
    }

    // Success! Clean up test post
    if (post) {
      await supabase.from('photos').delete().eq('id', post.id)
    }

    res.json({
      success: true,
      message: 'Schema test successful! file_urls and cover_index columns exist and work correctly.',
      test_post_id: post?.id
    })

  } catch (error) {
    console.error('Schema test error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Unexpected error during schema test'
    })
  }
}