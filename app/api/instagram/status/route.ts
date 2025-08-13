import { type NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query parameters first (from Firebase Auth on client)
    const url = new URL(req.url)
    let userId = url.searchParams.get('userId')
    
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    

    
    if (!userId) {
      console.log('❌ No user ID found')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has an Instagram account connected
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram",
      },
    })
    
    if (!account) {
      return NextResponse.json({ connected: false })
    }

    // Test token validity. IMPORTANT: Do NOT delete the account on failure.
    // Try Business API then Basic Display API; preserve connection state and surface token validity.
    try {
      // Use appropriate API endpoint based on token type
      let response;
      if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
        // Basic Display API tokens use Instagram Graph API
        response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${account.access_token}`)
      } else {
        // Business API tokens use Facebook Graph API
        response = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${account.access_token}`)
      }
      let tokenValid = response.ok
      if (!tokenValid) {
        response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${account.access_token}`)
        tokenValid = response.ok
      }
      const accountData = tokenValid ? await response.json() : { id: account.providerAccountId, username: undefined, account_type: undefined }

      const hasBusinessPermissions = !!(account.scope?.includes("instagram_manage_messages") || account.scope?.includes("instagram_manage_comments"))

      return NextResponse.json({
        connected: true,
        tokenValid,
        account: {
          id: accountData.id || account.providerAccountId,
          username: accountData.username || "Unknown",
          account_type: accountData.account_type || (hasBusinessPermissions ? "business" : "personal"),
        },
        capabilities: {
          canDM: hasBusinessPermissions,
          canReplyToComments: hasBusinessPermissions,
        },
        hasBusinessPermissions,
        warning: tokenValid ? undefined : "Instagram token may be invalid or expired. Please reconnect if automations fail.",
      })
    } catch (error) {
      console.error("Error validating Instagram token:", error)
      // Preserve connection state even if validation fails due to network issues
      const hasBusinessPermissions = !!(account.scope?.includes("instagram_manage_messages") || account.scope?.includes("instagram_manage_comments"))
      return NextResponse.json({
        connected: true,
        tokenValid: undefined,
        account: {
          id: account.providerAccountId,
          username: "Unknown",
          account_type: hasBusinessPermissions ? "business" : "personal",
        },
        capabilities: {
          canDM: hasBusinessPermissions,
          canReplyToComments: hasBusinessPermissions,
        },
        hasBusinessPermissions,
        warning: "Could not validate token (network error).",
      })
    }
  } catch (error) {
    console.error("Instagram status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
