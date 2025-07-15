"use client"

import { useFirebaseAuth } from "@/components/firebase-auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Instagram, Unlink2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ReloadIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { InstagramConnection } from "@/components/instagram-connection"
import { useToast } from "@/hooks/use-toast"

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
  const { user, loading } = useFirebaseAuth()
  const { toast } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Check for existing Instagram connection on component mount
  const checkInstagramConnection = useCallback(async () => {
    if (user?.uid) {
      try {
        setIsChecking(true)
        console.log('🔍 Checking Instagram connection for user:', user.uid)
        const response = await fetch(`/api/instagram/status?userId=${user.uid}`)
        console.log('🔍 Instagram status response:', response.status, response.ok)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 Instagram status data:', data)
          
          if (data.connected) {
            console.log('✅ Instagram connected:', data.account)
            setConnectedAccount(data.account)
            onConnected()
          } else {
            console.log('❌ Instagram not connected')
            setConnectedAccount(null)
          }
        } else {
          console.log('❌ Instagram status check failed:', response.status)
          const errorData = await response.text()
          console.log('❌ Error response:', errorData)
        }
      } catch (error) {
        console.error("Error checking Instagram status:", error)
      } finally {
        setIsChecking(false)
      }
    } else {
      console.log('❌ No user UID available')
      setIsChecking(false)
    }
  }, [user?.uid, onConnected, loading])

  useEffect(() => {
    if (!loading) {
      checkInstagramConnection()
    }
  }, [checkInstagramConnection, loading])

  const handleConnectionSuccess = (account: InstagramAccount) => {
    setConnectedAccount(account)
    onConnected()
  }

  const handleDisconnect = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setIsDisconnecting(true)
    try {
      console.log('🔗 Disconnecting Instagram account for user:', user.uid)
      const response = await fetch(`/api/instagram/connect?userId=${user.uid}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to disconnect Instagram account")
      }

      // Update component state
      setConnectedAccount(null)
      setConnectionError("")

      toast({
        title: "Success",
        description: "Instagram account disconnected successfully",
      })

      console.log('✅ Instagram account disconnected successfully')
    } catch (error) {
      console.error("Error disconnecting Instagram account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Instagram account",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full sm:w-auto"
              >
                {isDisconnecting ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink2 className="mr-2 h-4 w-4" />
                    Disconnect Account
                  </>
                )}
              </Button>
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

  // Show connected status for non-card version
  return (
    <Alert className={className}>
      <Instagram className="h-4 w-4" />
      <AlertTitle>Instagram Connected</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {connectedAccount.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">@{connectedAccount.username}</p>
              <p className="text-sm text-muted-foreground">{connectedAccount.account_type || "Business"} Account</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full sm:w-auto"
          >
            {isDisconnecting ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink2 className="mr-2 h-4 w-4" />
                Disconnect Account
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
} 