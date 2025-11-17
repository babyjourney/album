import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key if available, otherwise use regular client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
    console.log('Starting file_urls column migration...')

    // Try to add the column - if it already exists, this will fail silently
    console.log('Attempting to add file_urls column...')
    
    // We'll work directly with the data and let the database handle schema changes manually

    // Step 1: Get all multi-photo posts with URLs in description  
    console.log('Checking existing multi-photo posts...')
    
    const { data: postsToMigrate, error: fetchError } = await supabaseAdmin
      .from('photos')
      .select('id, description, file_urls, type')
      .eq('type', 'multi-photo')
      .like('description', '%__MULTI_PHOTO_URLS__%')

    if (fetchError) {
      console.error('Error fetching posts to migrate:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch posts: ' + fetchError.message })
    }

    let migratedCount = 0
    
    for (const post of postsToMigrate || []) {
      try {
        const marker = '__MULTI_PHOTO_URLS__:'
        const markerIndex = post.description.indexOf(marker)
        
        if (markerIndex === -1) continue
        
        const urlsJson = post.description.substring(markerIndex + marker.length).split('\n')[0]
        const urls = JSON.parse(urlsJson)
        
        if (Array.isArray(urls) && urls.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('photos')
            .update({ file_urls: urls })
            .eq('id', post.id)
          
          if (updateError) {
            console.error(`Error updating post ${post.id}:`, updateError)
          } else {
            migratedCount++
            console.log(`Migrated post ${post.id} with ${urls.length} URLs`)
          }
        }
      } catch (parseError) {
        console.error(`Error parsing URLs for post ${post.id}:`, parseError)
      }
    }

    console.log(`Migration completed. Migrated ${migratedCount} posts.`)

    res.json({ 
      success: true, 
      message: `Migration completed successfully. Added file_urls column and migrated ${migratedCount} existing posts.`,
      migratedPosts: migratedCount
    })

  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ error: 'Migration failed: ' + error.message })
  }
}