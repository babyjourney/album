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
    console.log('Checking database schema...')
    
    // Try to get columns information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'photos')

    if (columnsError) {
      console.log('Could not access information_schema, trying direct approach...')
      
      // Alternative: try to select from photos table with specific columns
      const { data: sampleData, error: selectError } = await supabase
        .from('photos')
        .select('id, file_urls, cover_index')
        .limit(1)

      if (selectError) {
        if (selectError.message.includes('column "file_urls" does not exist')) {
          return res.json({
            success: false,
            columns_missing: ['file_urls'],
            message: 'file_urls column does not exist',
            sql_needed: 'ALTER TABLE photos ADD COLUMN file_urls JSONB;'
          })
        } else if (selectError.message.includes('column "cover_index" does not exist')) {
          return res.json({
            success: false,
            columns_missing: ['cover_index'],
            message: 'cover_index column does not exist',
            sql_needed: 'ALTER TABLE photos ADD COLUMN cover_index INTEGER DEFAULT 0;'
          })
        } else {
          return res.json({
            success: false,
            error: selectError.message,
            message: 'Could not check schema'
          })
        }
      }

      return res.json({
        success: true,
        message: 'All required columns exist (file_urls and cover_index)',
        sample_data: sampleData
      })
    }

    // Check which columns exist
    const columnNames = columns?.map(col => col.column_name) || []
    const hasFileUrls = columnNames.includes('file_urls')
    const hasCoverIndex = columnNames.includes('cover_index')

    const missingColumns = []
    const sqlNeeded = []
    
    if (!hasFileUrls) {
      missingColumns.push('file_urls')
      sqlNeeded.push('ALTER TABLE photos ADD COLUMN file_urls JSONB;')
      sqlNeeded.push('CREATE INDEX IF NOT EXISTS idx_photos_file_urls ON photos USING GIN (file_urls);')
    }
    
    if (!hasCoverIndex) {
      missingColumns.push('cover_index')
      sqlNeeded.push('ALTER TABLE photos ADD COLUMN cover_index INTEGER DEFAULT 0;')
    }

    if (missingColumns.length > 0) {
      return res.json({
        success: false,
        columns_missing: missingColumns,
        columns_found: columnNames,
        message: `Missing columns: ${missingColumns.join(', ')}`,
        sql_needed: sqlNeeded.join('\n')
      })
    }

    res.json({
      success: true,
      message: 'All required columns exist',
      columns_found: columnNames,
      has_file_urls: hasFileUrls,
      has_cover_index: hasCoverIndex
    })

  } catch (error) {
    console.error('Schema check error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Unexpected error during schema check'
    })
  }
}