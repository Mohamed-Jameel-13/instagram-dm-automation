import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Instagram } from "lucide-react"

interface InstagramAccount {
  id: string
  username: string
  account_type: string
}

interface InstagramConnectionProps {
  onConnectionSuccess?: (account: InstagramAccount) => void
  compact?: boolean
}

export function InstagramConnection({ onConnectionSuccess, compact = false }: InstagramConnectionProps) {
  const { data: session, status } = useSession()
  const [isConnecting, setIsConnecting] = useState(false)
  const [accessToken, setAccessToken] = useState("")
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)

  const handleOAuthConnection = async () => {
    setIsConnecting(true)
    try {
      const result = await signIn("instagram", { 
        redirect: false,
        callbackUrl: "/dashboard"
      })
      
      if (result?.error) {
        if (result.error === "Configuration") {
          throw new Error("Instagram OAuth is not configured. Please use the manual token method or configure OAuth credentials.")
        }
        throw new Error(result.error)
      }
      
      // If successful, the page will redirect and the connection will be handled by NextAuth
      toast({
        title: "Redirecting to Instagram...",
        description: "You'll be redirected to Instagram to authorize the connection",
      })
    } catch (error) {
      console.error("Instagram OAuth error:", error)
      toast({
        title: "OAuth Not Available",
        description: error instanceof Error ? error.message : "Please use the manual token method below",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleManualConnection = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Instagram access token",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      // Test the access token using Basic Display API
      const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
      
      if (!response.ok) {
        throw new Error("Invalid access token")
      }

      const accountData = await response.json()

      // Save the connection to your database
      const saveResponse = await fetch("/api/instagram/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          instagramId: accountData.id,
          username: accountData.username,
          accountType: "personal", // Basic Display API doesn't have account_type
        }),
      })

      if (!saveResponse.ok) {
        if (saveResponse.status === 401) {
          throw new Error("Please log in first to connect your Instagram account")
        }
        const errorData = await saveResponse.text()
        throw new Error(`Failed to save Instagram connection: ${errorData}`)
      }

      setConnectedAccount(accountData)
      onConnectionSuccess?.(accountData)
      toast({
        title: "Success!",
        description: `Connected to Instagram account @${accountData.username}`,
      })
    } catch (error) {
      console.error("Instagram connection error:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Please check your access token and try again",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Check if user is authenticated
  if (status === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (status === "unauthenticated") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🔐 Login Required</CardTitle>
          <CardDescription>
            Please log in to connect your Instagram account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="w-full"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (connectedAccount) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">✅ Instagram Connected</CardTitle>
          <CardDescription>
            Your Instagram business account is connected and ready for automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
              {connectedAccount.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">@{connectedAccount.username}</p>
              <p className="text-sm text-gray-500">{connectedAccount.account_type} Account</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>✅ DM automation enabled</p>
            <p>✅ Comment automation enabled</p>
            <p>✅ Webhook configured</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <Button 
          onClick={handleOAuthConnection} 
          disabled={isConnecting}
          size="sm"
          className="w-full"
          variant="outline"
        >
          <Instagram className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Instagram"}
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accessToken" className="text-sm">Manual Access Token</Label>
          <Input
            id="accessToken"
            type="password"
            placeholder="IGAAR2zUZBc..."
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="h-8"
          />
        </div>
        
        <Button 
          onClick={handleManualConnection} 
          disabled={isConnecting || !accessToken.trim()}
          size="sm"
          className="w-full"
          variant="secondary"
        >
          {isConnecting ? "Connecting..." : "Connect with Token"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Instagram Account</CardTitle>
          <CardDescription>
            Connect your Instagram account to enable DM and comment automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleOAuthConnection} 
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            <Instagram className="mr-2 h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect with Instagram"}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or use manual token</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accessToken">Instagram Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="IGAAR2zUZBc..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Paste your Instagram access token here for manual connection
            </p>
          </div>
          
          <Button 
            onClick={handleManualConnection} 
            disabled={isConnecting || !accessToken.trim()}
            className="w-full"
            variant="secondary"
          >
            {isConnecting ? "Connecting..." : "Connect with Access Token"}
          </Button>

        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">📋 Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="font-medium">OAuth Method (Recommended)</p>
            <p className="text-gray-600">Click "Connect with Instagram" for easy setup with OAuth</p>
          </div>
          <div>
            <p className="font-medium">Manual Token Method</p>
            <p className="text-gray-600">Use your existing Instagram access token for instant connection</p>
          </div>
          <div className="text-xs text-gray-500 mt-4">
            <p>✅ Webhook URL: https://instagram-automation-writesparkai.loca.lt/api/webhooks/instagram</p>
            <p>✅ Verify Token: verify_ig_webhook_2024_a7f3k9m2n8q1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
