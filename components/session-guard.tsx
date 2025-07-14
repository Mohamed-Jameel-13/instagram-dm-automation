'use client'

import { useFirebaseAuth } from './firebase-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface SessionGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function SessionGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: SessionGuardProps) {
  const { user, loading } = useFirebaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !user) {
    return null
  }

  return <>{children}</>
} 