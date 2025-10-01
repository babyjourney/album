// Utility functions for text processing

/**
 * Normalizes text by removing diacritics and converting to lowercase
 * @param {string} text - The text to normalize
 * @returns {string} - The normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[șş]/g, 's') // Handle Romanian specific characters
    .replace(/[țţ]/g, 't')
    .replace(/[ăâ]/g, 'a')
    .replace(/[îi]/g, 'i')
    .trim()
}

/**
 * Checks if a normalized search term matches normalized content
 * @param {string} content - The content to search in
 * @param {string} searchTerm - The search term
 * @returns {boolean} - Whether the search term matches
 */
export function matchesSearch(content, searchTerm) {
  if (!content || !searchTerm) return false
  
  const normalizedContent = normalizeText(content)
  const normalizedSearch = normalizeText(searchTerm)
  
  return normalizedContent.includes(normalizedSearch)
}

/**
 * Filters an array of objects by searching in specified fields
 * @param {Array} items - Array of objects to filter
 * @param {string} searchTerm - The search term
 * @param {Array} fields - Array of field names to search in
 * @returns {Array} - Filtered array
 */
export function filterBySearch(items, searchTerm, fields = []) {
  if (!searchTerm || !Array.isArray(items)) return items
  
  const normalizedSearch = normalizeText(searchTerm)
  
  return items.filter(item => {
    return fields.some(field => {
      const fieldValue = item[field]
      if (!fieldValue) return false
      
      // Handle arrays (like hashtags)
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(val => matchesSearch(String(val), normalizedSearch))
      }
      
      // Handle strings
      return matchesSearch(String(fieldValue), normalizedSearch)
    })
  })
}