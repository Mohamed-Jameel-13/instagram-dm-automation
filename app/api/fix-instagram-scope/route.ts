import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Instagram account
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram"
      }
    })

    if (!account) {
      return NextResponse.json({ 
        error: "No Instagram account found. Please connect Instagram first." 
      }, { status: 404 })
    }

    // Test if the current token has business permissions
    if (!account.access_token) {
      return NextResponse.json({ 
        error: "No access token found. Please reconnect Instagram." 
      }, { status: 400 })
    }

    // Test the token with appropriate API endpoint based on token type
    let validationUrl;
    if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
      validationUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${account.access_token}`;
    } else {
      validationUrl = `https://graph.facebook.com/me?fields=id,username,account_type&access_token=${account.access_token}`;
    }
    
    const response = await fetch(validationUrl)

    let isBusiness = false
    let accountData = null

    if (response.ok) {
      accountData = await response.json()
      isBusiness = true
      console.log("✅ Business API token detected:", accountData)
    } else {
      // Try Basic Display API
      const basicResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${account.access_token}`
      )
      
      if (basicResponse.ok) {
        accountData = await basicResponse.json()
        console.log("ℹ️ Basic Display API token detected:", accountData)
      } else {
        return NextResponse.json({ 
          error: "Token is invalid or expired. Please reconnect Instagram." 
        }, { status: 400 })
      }
    }

    // Update scope based on token type
    const newScope = isBusiness 
      ? "instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement"
      : "user_profile,user_media"

    // Update the account scope
    await prisma.account.update({
      where: { id: account.id },
      data: { scope: newScope }
    })

    return NextResponse.json({
      success: true,
      message: `Instagram scope updated to: ${newScope}`,
      isBusiness,
      accountData,
      hasBusinessPermissions: isBusiness,
      recommendations: isBusiness 
        ? ["✅ Account ready for automation!"]
        : [
            "❌ This is a Basic Display API token",
            "Need Business API token for DM/comment automation",
            "Please get a new token from Meta for Developers"
          ]
    })

  } catch (error) {
    console.error("Fix scope error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
