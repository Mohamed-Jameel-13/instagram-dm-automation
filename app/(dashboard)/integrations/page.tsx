"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useFirebaseAuth } from '@/components/firebase-auth'

export default function IntegrationsPage() {
  const [instagramAccount, setInstagramAccount] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useFirebaseAuth()

  useEffect(() => {
    if (user) {
      fetch(`/api/accounts/${user.uid}/instagram`)
        .then(res => res.json())
        .then(data => {
          if (data.account) {
            setInstagramAccount(data.account)
          }
          setIsLoading(false)
        })
    }
  }, [user])

  const handleConnect = () => {
    window.location.href = "/api/auth/instagram/start"
  }

  const handleDisconnect = async () => {
    if (!user) return
    await fetch(`/api/instagram/connect?userId=${user.uid}`, { method: 'DELETE' })
    setInstagramAccount(null)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>Instagram</CardTitle>
          <CardDescription>Connect your Instagram account to start automating your comments and DMs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : instagramAccount ? (
            <div>
              <p>Connected as: <strong>{instagramAccount.username}</strong></p>
            </div>
          ) : (
            <p>No Instagram account connected.</p>
          )}
        </CardContent>
        <CardFooter>
          {instagramAccount ? (
            <Button onClick={handleDisconnect} variant="destructive">Disconnect</Button>
          ) : (
            <Button onClick={handleConnect}>Connect Instagram</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
