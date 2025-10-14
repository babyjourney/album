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

// Function to get categories from localStorage or use defaults
export function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  
  try {
    const stored = localStorage.getItem('customCategories')
    if (stored) {
      const customCategories = JSON.parse(stored)
      return customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES
    }
  } catch (error) {
    console.error('Error loading custom categories:', error)
  }
  
  return DEFAULT_CATEGORIES
}

// Function to save categories to localStorage
export function saveCategories(categories) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('customCategories', JSON.stringify(categories))
  } catch (error) {
    console.error('Error saving custom categories:', error)
  }
}

// Function to add a new category
export function addCategory(newCategory) {
  const categories = getCategories()
  const updatedCategories = [...categories, newCategory]
  saveCategories(updatedCategories)
  return updatedCategories
}

// Function to update an existing category
export function updateCategory(categoryValue, updatedCategory) {
  const categories = getCategories()
  const updatedCategories = categories.map(cat => 
    cat.value === categoryValue ? updatedCategory : cat
  )
  saveCategories(updatedCategories)
  return updatedCategories
}

// Function to delete a category
export function deleteCategory(categoryValue) {
  const categories = getCategories()
  // Prevent deleting default essential categories
  const essentialCategories = ['memories', 'family']
  if (essentialCategories.includes(categoryValue)) {
    throw new Error('Cannot delete essential categories')
  }
  
  const updatedCategories = categories.filter(cat => cat.value !== categoryValue)
  saveCategories(updatedCategories)
  return updatedCategories
}

// Function to reset to default categories
export function resetToDefaults() {
  saveCategories(DEFAULT_CATEGORIES)
  return DEFAULT_CATEGORIES
}