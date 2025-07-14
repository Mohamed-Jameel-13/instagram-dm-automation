'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

interface FirebaseAuthContextType {
  user: User | null
  loading: boolean
}

export function useFirebaseAuth(): FirebaseAuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
} 