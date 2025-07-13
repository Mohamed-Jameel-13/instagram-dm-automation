'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page with signup mode
    router.replace('/login?mode=signup')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Redirecting...</h1>
          <p className="text-muted-foreground">Taking you to the signup page</p>
        </div>
      </div>
    </div>
  )
}
