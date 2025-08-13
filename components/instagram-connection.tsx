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
    
    // Check token format - even more flexible check for Facebook/Instagram tokens
    const isLikelyValidToken = 
      cleanToken.length > 50 && (
        cleanToken.startsWith('IG') || 
        cleanToken.includes('EAA') ||  // Matches both EAAC and EAA
        cleanToken.includes('EAF') ||  // Matches EAF tokens
        cleanToken.startsWith('IGQVJ')
      );
      
    if (!isLikelyValidToken) {
      toast({
        title: "Incorrect Token Format", 
        description: "Please use a valid Instagram or Facebook access token. Valid tokens are usually 100+ characters long.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      // Test the access token - try Business API first, then Basic Display API
      console.log('Testing access token...')
      console.log('Token prefix:', cleanToken.substring(0, 10) + '...')
      
      let response;
      let accountData;
      let tokenType = "unknown";
      let errorDetails = "";
      
      // First try Business API endpoint
      try {
        console.log('Attempting Facebook Graph API test...')
        response = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${cleanToken}`)
        
        if (response.ok) {
          accountData = await response.json()
          tokenType = "business"
          console.log('✅ Business API token detected:', accountData)
        } else {
          const errorText = await response.text()
          console.error('❌ Facebook Graph API test failed:', errorText)
          errorDetails += `Facebook API error: ${errorText}\n`
        }
      } catch (error) {
        console.error('❌ Business API test exception:', error)
        errorDetails += `Facebook API exception: ${error}\n`
      }
      
      // If Business API failed, try Basic Display API
      if (!response || !response.ok) {
        try {
          console.log('Attempting Instagram Graph API test...')
          response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${cleanToken}`)
          
          if (response.ok) {
            accountData = await response.json()
            tokenType = "basic_display"
            console.log('✅ Basic Display API token detected:', accountData)
          } else {
            const errorText = await response.text()
            console.error('❌ Instagram Graph API test failed:', errorText)
            errorDetails += `Instagram API error: ${errorText}\n`
          }
        } catch (error) {
          console.error('❌ Instagram API test exception:', error)
          errorDetails += `Instagram API exception: ${error}\n`
        }
      }
      
      // If both failed, try debug token endpoint
      if (!response || !response.ok) {
        try {
          console.log('Attempting debug_token endpoint...')
          const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${cleanToken}&access_token=${cleanToken}`)
          const debugData = await debugResponse.text()
          console.log('Debug token response:', debugData)
          errorDetails += `Debug token info: ${debugData}\n`
        } catch (error) {
          console.error('❌ Debug token test failed:', error)
        }
        
        // Get more detailed error information
        console.error('All API tests failed')
        console.error('Detailed errors:', errorDetails)
        
        throw new Error(`Invalid access token (Status: ${response?.status || 'unknown'}). Please check your token and try again. ${errorDetails.substring(0, 100)}...`)
      }

      console.log(`Instagram account data (${tokenType}):`, accountData)

      // Save the connection to your database
      const saveResponse = await fetch("/api/instagram/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: cleanToken,
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
              <p><strong>For DM automation:</strong> Use Instagram Business API token (starts with EAAC...)</p>
              <p><strong>For basic features:</strong> Instagram Basic Display API token (starts with IGQVJ...)</p>
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
            <p className="font-medium">📱 Instagram Token Requirements for DM Automation</p>
            <ul className="text-gray-600 space-y-1 mt-2">
              <li>• Use <strong>Instagram Business API</strong> tokens (EAAC...)</li>
              <li>• Must have <strong>instagram_manage_messages</strong> permission</li>
              <li>• Must have <strong>instagram_manage_comments</strong> permission</li>
              <li>• Instagram account must be converted to Business</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">🔧 Common Issues</p>
            <ul className="text-gray-600 space-y-1 mt-2">
              <li>• Wrong token type (use Business API, not Basic Display)</li>
              <li>• Missing messaging permissions in Facebook App</li>
              <li>• Expired tokens (regenerate from Facebook Developer)</li>
              <li>• Instagram account not set to Business</li>
            </ul>
          </div>
          <div className="text-xs text-gray-500 mt-4 space-y-1">
            <p>🔗 Webhook URL: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/instagram` : '/api/webhooks/instagram'}</code></p>
            <p>🔐 Verify Token: set <code>INSTAGRAM_WEBHOOK_VERIFY_TOKEN</code> in your environment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
