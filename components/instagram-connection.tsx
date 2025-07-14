import { useState } from "react"
import { useFirebaseAuth } from "@/components/firebase-auth"
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
  const { user, loading } = useFirebaseAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [accessToken, setAccessToken] = useState("")
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)
  const [componentId] = useState(() => Math.random().toString(36).substring(2, 9))

  const handleOAuthConnection = async () => {
    setIsConnecting(true)
    try {
      // Instagram OAuth is not configured with Firebase Auth
      throw new Error("Instagram OAuth is not configured with Firebase Auth. Please use the manual token method below.")
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

    // Clean and validate token
    const cleanToken = accessToken.trim()
    
    // Check if user pasted an error message instead of token
    if (cleanToken.toLowerCase().includes('error') || cleanToken.toLowerCase().includes('invalid')) {
      toast({
        title: "Invalid Token",
        description: "It looks like you pasted an error message. Please paste only the actual Instagram access token.",
        variant: "destructive",
      })
      return
    }
    
    // Basic token validation
    if (cleanToken.length < 50) {
      toast({
        title: "Invalid Token Format",
        description: "Instagram access tokens are much longer (200+ characters). Please check your token.",
        variant: "destructive",
      })
      return
    }
    
    // Check token format
    if (!cleanToken.startsWith('IG') && !cleanToken.startsWith('EAAC') && !cleanToken.startsWith('IGQVJ')) {
      toast({
        title: "Incorrect Token Type",
        description: "Please use Instagram Basic Display API tokens (usually start with 'IGQVJ' or 'IG').",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      // Test the access token using Basic Display API
      console.log('Testing access token...')
      const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${cleanToken}`)
      
      if (!response.ok) {
        // Get more detailed error information
        const errorData = await response.text()
        console.error('Instagram API error:', errorData)
        console.error('Response status:', response.status)
        
        try {
          const parsedError = JSON.parse(errorData)
          if (parsedError.error && parsedError.error.message) {
            throw new Error(`Instagram API Error: ${parsedError.error.message}`)
          }
        } catch {
          // If parsing fails, use the raw error
        }
        
        throw new Error(`Invalid access token (Status: ${response.status}). Please check your token and try again.`)
      }

      const accountData = await response.json()
      console.log('Instagram account data:', accountData)

      // Save the connection to your database
      const saveResponse = await fetch("/api/instagram/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: cleanToken,
          instagramId: accountData.id,
          username: accountData.username,
          accountType: "personal", // Basic Display API doesn't have account_type
          userId: user?.uid, // Send the Firebase Auth user ID
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
      
      // Clear the token field on error to force re-entry
      setAccessToken("")
      
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
  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!loading && !user) {
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
        {/* OAuth button removed - not configured with Firebase Auth */}
        
        {/* Divider removed since OAuth is not available */}
        
        <div className="space-y-2">
          <Label htmlFor={`accessToken-${componentId}`} className="text-sm">Manual Access Token</Label>
          <Input
            id={`accessToken-${componentId}`}
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
          {/* OAuth button removed - not configured with Firebase Auth */}
          
          {/* Divider removed since OAuth is not available */}
          
          <div className="space-y-2">
            <Label htmlFor="accessToken">Instagram Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="IGAAR2zUZBc..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="text-xs text-gray-500 space-y-1">
              <p>Paste your Instagram Basic Display API access token here</p>
              <p><strong>Valid token example:</strong> IGQVJ... (200+ characters)</p>
              <p><strong>⚠️ Don't paste error messages</strong> - only the actual token!</p>
            </div>
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
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">📱 Instagram Token Requirements</p>
            <ul className="text-gray-600 space-y-1 mt-2">
              <li>• Use <strong>Instagram Basic Display API</strong> tokens</li>
              <li>• Personal Instagram accounts work best</li>
              <li>• Token should be long-lived (60 days)</li>
              <li>• Token format: IGQVJ... (very long string)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">🔧 Common Issues</p>
            <ul className="text-gray-600 space-y-1 mt-2">
              <li>• Expired tokens (regenerate from Instagram)</li>
              <li>• Business account tokens (try personal account)</li>
              <li>• Short-lived tokens (exchange for long-lived)</li>
            </ul>
          </div>
          <div className="text-xs text-gray-500 mt-4 space-y-1">
            <p>🔗 Webhook URL: https://instagram-automation-writesparkai.loca.lt/api/webhooks/instagram</p>
            <p>🔐 Verify Token: verify_ig_webhook_2024_a7f3k9m2n8q1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
