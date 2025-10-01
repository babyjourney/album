import { supabase } from './supabaseClient'

export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { profile: null, error: 'No authenticated user' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      families (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  return { profile, error }
}