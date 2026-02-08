import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAuthenticated } from '../lib/pinAuth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [])

  return null
}
