import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { postId, title, description, hashtags } = req.body

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' })
  }

  try {
    // Update the post in the database
    const { data, error } = await supabase
      .from('photos')
      .update({
        title: title || null,
        description: description || null,
        hashtags: hashtags || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()

    if (error) {
      console.error('Error updating post:', error)
      return res.status(500).json({ error: 'Failed to update post' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.status(200).json({ 
      success: true, 
      message: 'Post updated successfully',
      post: data[0]
    })
  } catch (error) {
    console.error('Error in update API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}