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

    // Test if the access token is still valid using Basic Display API
    try {
      const response = await fetch(`https://graph.facebook.com/me?fields=id,username&access_token=${account.access_token}`)
      
      if (!response.ok) {
        // Token is invalid, remove the account
        await prisma.account.delete({
          where: { id: account.id },
        })
        return NextResponse.json({ connected: false, error: "Token expired" })
      }

      const accountData = await response.json()

      return NextResponse.json({
        connected: true,
        account: {
          id: accountData.id,
          username: accountData.username,
          account_type: "personal", // Basic Display API doesn't provide account_type
        },
      })
    } catch (error) {
      console.error("Error validating Instagram token:", error)
      return NextResponse.json({ connected: false, error: "Token validation failed" })
    }
  } catch (error) {
    console.error("Instagram status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
