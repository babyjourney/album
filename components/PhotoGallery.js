import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'

const CATEGORIES = [
  { value: 'all', label: 'All Posts', emoji: '📋' },
  { value: 'memories', label: 'Memories', emoji: '💭' },
  { value: 'milestones', label: 'Milestones', emoji: '🎯' },
  { value: 'everyday', label: 'Everyday', emoji: '☀️' },
  { value: 'special', label: 'Special', emoji: '✨' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'celebration', label: 'Celebration', emoji: '🎉' }
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title', label: 'Title A-Z' }
]

export default function PhotoGallery({ familyId, refreshTrigger, readOnly = false, showTitle = "Photo Gallery" }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const { showSuccess, showError } = useToast()
  const { language } = useLanguage()

  useEffect(() => {
    fetchPhotos()
  }, [familyId, refreshTrigger])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/photos/list?familyId=${familyId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load photos')
      }

      setPhotos(result.photos || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
      setError('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (photoId, fileUrl) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    try {
      const response = await fetch('/api/photos/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId,
          fileUrl
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete photo')
      }

      setPhotos(photos.filter(photo => photo.id !== photoId))
      setSelectedPhoto(null)
      
      // Show success toast
      showSuccess('Post deleted successfully!')
    } catch (error) {
      console.error('Error deleting photo:', error)
      const errorMessage = 'Failed to delete photo. Please try again.'
      showError(errorMessage)
    }
  }
  
  // Filter and sort photos
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = photos
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(photo => photo.category === selectedCategory)
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'title':
          const titleA = (a.title || '').toLowerCase()
          const titleB = (b.title || '').toLowerCase()
          return titleA.localeCompare(titleB)
        default:
          return 0
      }
    })
    
    return sorted
  }, [photos, selectedCategory, sortBy])

  if (loading) {
    return (
      <div className="post-card card-padding">
        <h2 className="heading-2 mb-6">Photo Gallery</h2>
        <div className="gallery-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="post-card p-0 overflow-hidden">
              <div className="skeleton aspect-square"></div>
              <div className="p-4">
                <div className="skeleton h-4 w-3/4 mb-2"></div>
                <div className="skeleton h-3 w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="post-card card-padding">
        <h2 className="heading-2 mb-6">Photo Gallery</h2>
        <div className="toast toast-error relative">
          {error}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="post-card card-padding">
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-2">
            {showTitle}
          </h2>
          <div className="body-small text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredAndSortedPhotos.length} of {photos.length} posts
          </div>
        </div>
        
        {/* Filter and Sort Controls */}
        {photos.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Category Filter */}
            <div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`filter-pill ${
                      selectedCategory === category.value ? 'filter-pill-active' : 'filter-pill-inactive'
                    }`}
                  >
                    <span className="mr-1">{category.emoji}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="body-small text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="body-small border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="body-small text-gray-500 hover:text-gray-700"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}
        
        {filteredAndSortedPhotos.length === 0 ? (
          selectedCategory === 'all' ? (
            <div className="empty-state">
              <div className="empty-state-icon">📸</div>
              <h3 className="empty-state-title">No posts yet</h3>
              <p className="empty-state-description">
                Share your first memory! Upload a photo, video, or create a text post above.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">No posts in this category</h3>
              <p className="empty-state-description">
                No posts found for "{CATEGORIES.find(cat => cat.value === selectedCategory)?.label}". Try selecting a different category or create a new post!
              </p>
            </div>
          )
        ) : (
          <div className="gallery-grid">
            {filteredAndSortedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="post-card p-0 overflow-hidden cursor-pointer group"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Post content area */}
                {photo.type === 'text' ? (
                  <div className="image-container bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-3xl mb-3">💭</div>
                      <p className="body-small text-gray-700 line-clamp-4 break-words">
                        {photo.description || 'Text post'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="image-container">
                    {(photo.file_type === 'image' || photo.type === 'image') ? (
                      <img
                        src={photo.file_url}
                        alt={photo.title || 'Image'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          console.error('Image failed to load:', photo.file_url)
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (photo.file_type === 'video' || photo.type === 'video') ? (
                      <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
                        <div className="text-center">
                          <div className="text-3xl mb-2">▶️</div>
                          <div className="body-small font-medium">Video</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-600">
                        <div className="text-center">
                          <div className="text-3xl mb-2">📄</div>
                          <div className="body-small">File</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Post metadata */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="body-medium font-semibold text-gray-900 line-clamp-1">
                      {photo.title || (photo.type === 'text' ? 'Text Post' : 'Untitled')}
                    </h3>
                    {photo.category && (
                      <span className="body-small text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
                        {photo.category}
                      </span>
                    )}
                  </div>
                  
                  {photo.description && photo.type !== 'text' && (
                    <p className="body-small text-gray-600 line-clamp-2 mb-2">
                      {photo.description}
                    </p>
                  )}
                  
                  <div className="body-small text-gray-400">
                    {new Date(photo.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'ro-RO', {
                      month: 'short',
                      day: 'numeric',
                      year: photo.created_at.includes(new Date().getFullYear().toString()) ? undefined : 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Show results count when filtering */}
        {photos.length > 0 && selectedCategory !== 'all' && (
          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <p className="body-small text-gray-500">
              Showing {filteredAndSortedPhotos.length} posts in "{CATEGORIES.find(cat => cat.value === selectedCategory)?.label}"
            </p>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="overlay flex items-center justify-center p-4 z-50">
          <div className="modal">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="heading-3">
                    {selectedPhoto.title || (selectedPhoto.type === 'text' ? 'Text Post' : 'Untitled')}
                  </h3>
                  {selectedPhoto.category && (
                    <span className="body-small text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {selectedPhoto.category}
                    </span>
                  )}
                </div>
                <p className="body-small text-gray-500">
                  {new Date(selectedPhoto.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'ro-RO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {!readOnly && (
                  <button
                    onClick={() => handleDeletePhoto(selectedPhoto.id, selectedPhoto.file_url)}
                    className="btn btn-ghost text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-auto custom-scrollbar" style={{maxHeight: 'calc(90vh - 120px)'}}>
              {selectedPhoto.type === 'text' ? (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 min-h-48">
                  <div className="text-center">
                    <div className="text-5xl mb-6">💭</div>
                    <div className="body-large text-gray-800 whitespace-pre-wrap leading-relaxed max-w-2xl mx-auto">
                      {selectedPhoto.description || 'Empty text post'}
                    </div>
                  </div>
                </div>
              ) : (selectedPhoto.file_type === 'image' || selectedPhoto.type === 'image') ? (
                <div className="relative w-full flex items-center justify-center bg-gray-50 rounded-2xl p-4">
                  <img
                    src={selectedPhoto.file_url}
                    alt={selectedPhoto.title || 'Image'}
                    className="max-w-full max-h-96 object-contain rounded-xl shadow-soft"
                    onError={(e) => {
                      console.error('Modal image failed to load:', selectedPhoto.file_url)
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              ) : (selectedPhoto.file_type === 'video' || selectedPhoto.type === 'video') ? (
                <video
                  src={selectedPhoto.file_url}
                  controls
                  className="w-full max-h-96 rounded-xl shadow-soft"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <h3 className="empty-state-title">File preview unavailable</h3>
                  <p className="empty-state-description mb-6">
                    This file type cannot be previewed in the browser.
                  </p>
                  <a
                    href={selectedPhoto.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Open File
                  </a>
                </div>
              )}
              
              {selectedPhoto.description && selectedPhoto.type !== 'text' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="heading-3 mb-3">Description</h4>
                  <p className="body-medium text-gray-700 leading-relaxed">
                    {selectedPhoto.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}