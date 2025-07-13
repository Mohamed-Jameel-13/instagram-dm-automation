"use client"

import { useSession } from "next-auth/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Instagram } from "lucide-react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ReloadIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { InstagramConnection } from "@/components/instagram-connection"

interface InstagramAccount {
  id: string
  username: string
  account_type?: string
}

export function InstagramConnectionStatus({ 
  showCard = false, 
  className = "",
  onConnected = () => {} 
}: { 
  showCard?: boolean;
  className?: string;
  onConnected?: () => void;
}) {
  const { data: session, status } = useSession()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)

  // Check for existing Instagram connection on component mount
  useEffect(() => {
    const checkInstagramConnection = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/instagram/status")
          if (response.ok) {
            const data = await response.json()
            if (data.connected) {
              setConnectedAccount(data.account)
              onConnected()
            }
          }
        } catch (error) {
          console.error("Error checking Instagram status:", error)
        }
      }
    }

    checkInstagramConnection()
  }, [session, onConnected])

  const handleConnectionSuccess = (account: InstagramAccount) => {
    setConnectedAccount(account)
    onConnected()
  }

  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Instagram className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Instagram Business</CardTitle>
              <CardDescription>Connect your Instagram business account for automation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {connectionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}
          
          {connectedAccount ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {connectedAccount.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">@{connectedAccount.username}</p>
                  <p className="text-sm text-muted-foreground">{connectedAccount.account_type || "Business"} Account</p>
                </div>
              </div>
              <div className="text-sm text-green-600">
                <p>✅ DM automation ready</p>
                <p>✅ Comment automation ready</p>
                <p>✅ Webhook configured</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use your existing Instagram access token to quickly connect your business account.
              </p>
              <InstagramConnection onConnectionSuccess={handleConnectionSuccess} />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {connectedAccount && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircledIcon className="h-5 w-5" />
              <span>Connected to @{connectedAccount.username}</span>
            </div>
          )}
        </CardFooter>
      </Card>
    )
  }

  if (connectionError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>Instagram Connection Error</AlertTitle>
        <AlertDescription>{connectionError}</AlertDescription>
      </Alert>
    )
  }

  if (!connectedAccount) {
    return (
      <Alert className={className}>
        <Instagram className="h-4 w-4" />
        <AlertTitle>Instagram Not Connected</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col space-y-2">
            <span>Connect your Instagram business account to use automations</span>
            <div className="max-w-md">
              <InstagramConnection onConnectionSuccess={handleConnectionSuccess} compact />
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
} 