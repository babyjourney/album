// Default categories - these can be extended by users
export const DEFAULT_CATEGORIES = [
  { value: 'memories', label: 'Amintiri', emoji: '💭' },
  { value: 'milestones', label: 'Etape importante', emoji: '🎯' },
  { value: 'everyday', label: 'Zilnic', emoji: '☀️' },
  { value: 'special', label: 'Special', emoji: '✨' },
  { value: 'family', label: 'Familie', emoji: '👨‍👩‍👧‍👦' },
  { value: 'play', label: 'Joacă', emoji: '🎮' },
  { value: 'learning', label: 'Învățare', emoji: '📚' }
]

// Cache pentru categorii pentru a evita request-uri multiple
let categoriesCache = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minute cache

// Function to get categories - tries API first, falls back to localStorage, then defaults
export async function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  
  // Check cache first
  const now = Date.now()
  if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return categoriesCache
  }
  
  // Try API first
  try {
    const response = await fetch('/api/categories/list', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success && result.categories) {
        categoriesCache = result.categories
        cacheTimestamp = now
        return result.categories
      }
    }
  } catch (error) {
    console.log('API not available, using localStorage fallback:', error.message)
  }
  
  // Fallback to localStorage if API fails
  try {
    const stored = localStorage.getItem('customCategories')
    if (stored) {
      const customCategories = JSON.parse(stored)
      if (customCategories.length > 0) {
        categoriesCache = customCategories
        cacheTimestamp = now
        return customCategories
      }
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  
  // Final fallback to defaults
  categoriesCache = DEFAULT_CATEGORIES
  cacheTimestamp = now
  return DEFAULT_CATEGORIES
}

// Sync version for backward compatibility (tries cache first, then defaults)
export function getCategoriesSync() {
  if (categoriesCache) {
    return categoriesCache
  }
  return DEFAULT_CATEGORIES
}

// Function to clear cache (call when categories are modified)
function clearCache() {
  categoriesCache = null
  cacheTimestamp = 0
}

// Function to add a new category
export async function addCategory(newCategory) {
  try {
    // Try API first
    const response = await fetch('/api/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newCategory)
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories() // Return updated categories
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API add failed, using localStorage fallback:', error.message)
    
    // Fallback to localStorage
    try {
      const categories = await getCategoriesFromLocalStorage()
      
      // Check if value already exists
      if (categories.some(cat => cat.value === newCategory.value)) {
        throw new Error('Category with this value already exists')
      }
      
      const updatedCategories = [...categories, newCategory]
      saveCategoriesToLocalStorage(updatedCategories)
      clearCache()
      return updatedCategories
    } catch (localError) {
      console.error('localStorage fallback failed:', localError)
      throw localError
    }
  }
}

// Helper functions for localStorage operations with family isolation
function getCategoriesFromLocalStorage() {
  try {
    // Get current family ID from session/auth
    const familyId = getCurrentFamilyId()
    if (!familyId) return DEFAULT_CATEGORIES
    
    const stored = localStorage.getItem(`customCategories_${familyId}`)
    if (stored) {
      const customCategories = JSON.parse(stored)
      return customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return DEFAULT_CATEGORIES
}

function saveCategoriesToLocalStorage(categories) {
  try {
    const familyId = getCurrentFamilyId()
    if (familyId) {
      localStorage.setItem(`customCategories_${familyId}`, JSON.stringify(categories))
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// Helper to get current family ID from the session
function getCurrentFamilyId() {
  try {
    // Get from the PIN auth session storage
    const authSession = localStorage.getItem('family_session')
    if (authSession) {
      const parsed = JSON.parse(authSession)
      return parsed.familyId
    }
  } catch (error) {
    console.error('Error getting family ID:', error)
  }
  return null
}

// Function to update an existing category
export async function updateCategory(categoryValue, updatedCategory) {
  try {
    // Try API first
    const response = await fetch('/api/categories/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldValue: categoryValue,
        ...updatedCategory
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories() // Return updated categories
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API update failed, using localStorage fallback:', error.message)
    
    // Fallback to localStorage
    const categories = getCategoriesFromLocalStorage()
    const updatedCategories = categories.map(cat => 
      cat.value === categoryValue ? updatedCategory : cat
    )
    saveCategoriesToLocalStorage(updatedCategories)
    clearCache()
    return updatedCategories
  }
}

// Function to delete a category
export async function deleteCategory(categoryValue) {
  // Prevent deleting default essential categories
  const essentialCategories = ['memories', 'family']
  if (essentialCategories.includes(categoryValue)) {
    throw new Error('Cannot delete essential categories')
  }
  
  try {
    // Try API first
    const response = await fetch('/api/categories/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: categoryValue })
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories() // Return updated categories
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API delete failed, using localStorage fallback:', error.message)
    
    // Fallback to localStorage
    const categories = getCategoriesFromLocalStorage()
    const updatedCategories = categories.filter(cat => cat.value !== categoryValue)
    saveCategoriesToLocalStorage(updatedCategories)
    clearCache()
    return updatedCategories
  }
}

// Function to reset to default categories
export async function resetToDefaults() {
  try {
    // Try API first
    const response = await fetch('/api/categories/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return result.categories
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API reset failed, using localStorage fallback:', error.message)
    
    // Fallback to localStorage
    saveCategoriesToLocalStorage(DEFAULT_CATEGORIES)
    clearCache()
    return DEFAULT_CATEGORIES
  }
}