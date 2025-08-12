import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"
import { ensureUserExists } from "@/lib/user-utils"

export async function POST(req: NextRequest) {
  try {
    // Parse the request body first
    const body = await req.json()
    const { accessToken, instagramId, username, accountType, userId: requestUserId } = body
    
    console.log("🔗 Instagram connect request:", { 
      hasAccessToken: !!accessToken, 
      instagramId, 
      username, 
      accountType,
      requestUserId 
    })
    
    // Prioritize user ID from request body (from Firebase Auth on client)
    let userId = requestUserId
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      console.error("❌ No userId found in request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!accessToken || !instagramId || !username) {
      console.error("❌ Missing required fields:", { 
        hasAccessToken: !!accessToken, 
        hasInstagramId: !!instagramId, 
        hasUsername: !!username 
      })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("✅ Basic validation passed, testing access token...")

    // Verify the access token: try Business API, then Basic Display API
    let testResponse = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${accessToken}`)
    let isBusiness = false
    if (!testResponse.ok) {
      // Fallback to Basic Display API for tokens like IGQVJ... / IGA...
      testResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
    } else {
      isBusiness = true
    }
    
    if (!testResponse.ok) {
      console.error("❌ Instagram API validation failed:", testResponse.status, testResponse.statusText)
      return NextResponse.json({ error: "Invalid access token" }, { status: 400 })
    }

    const accountData = await testResponse.json()
    console.log("✅ Instagram API validation passed:", accountData)

    if (accountData.id !== instagramId) {
      console.error("❌ Token doesn't match Instagram ID:", { provided: instagramId, actual: accountData.id })
      return NextResponse.json({ error: "Token doesn't match provided Instagram ID" }, { status: 400 })
    }

    console.log("🔄 Ensuring user exists in database...")
    // Ensure the user exists in our database first
    try {
      await ensureUserExists(userId, username)
      console.log("✅ User exists/created successfully")
    } catch (userError) {
      console.error("❌ Error ensuring user exists:", userError)
      return NextResponse.json({ 
        error: "Failed to create/verify user", 
        details: userError instanceof Error ? userError.message : String(userError)
      }, { status: 500 })
    }

    console.log("🔄 Saving Instagram account connection...")
    
    // Detect token type and permissions
    let detectedScope = isBusiness 
      ? "instagram_manage_messages,instagram_manage_comments,user_profile,user_media" 
      : "user_profile,user_media"
    try {
      // Test if this is a Business API token by checking business-specific endpoint
      const businessTestResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramId}?fields=id,username,account_type&access_token=${accessToken}`
      )
      
      if (businessTestResponse.ok) {
        const data = await businessTestResponse.json()
        if (data.account_type === "BUSINESS") {
          console.log("✅ Detected Business API token - setting full permissions scope")
          detectedScope = "instagram_manage_messages,instagram_manage_comments,user_profile,user_media"
        }
      }
      
      // Additional test: Try to access conversations endpoint (requires messaging permission)
      const conversationTestResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramId}/conversations?access_token=${accessToken}`
      )
      
      if (conversationTestResponse.ok) {
        console.log("✅ Token has messaging permissions - updating scope")
        detectedScope = "instagram_manage_messages,instagram_manage_comments,user_profile,user_media"
      }
      
    } catch (error) {
      console.log("⚠️ Could not detect token permissions, using basic scope")
    }
    
    console.log("🔍 Detected scope:", detectedScope)
    
    // Save or update the Instagram account connection
    try {
      const account = await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "instagram",
            providerAccountId: instagramId,
          },
        },
        update: {
          access_token: accessToken,
          refresh_token: null,
          expires_at: null,
          scope: detectedScope,
        },
        create: {
          userId: userId,
          type: "oauth",
          provider: "instagram",
          providerAccountId: instagramId,
          access_token: accessToken,
          token_type: "bearer",
          scope: detectedScope,
        },
      })
      
      console.log("✅ Instagram account saved successfully:", { 
        accountId: account.id, 
        provider: account.provider,
        providerAccountId: account.providerAccountId 
      })

      return NextResponse.json({
        success: true,
        account: {
          id: instagramId,
          username: username,
          accountType: accountType,
        },
      })
    } catch (accountError) {
      console.error("❌ Error saving Instagram account:", accountError)
      return NextResponse.json({ 
        error: "Failed to save Instagram account", 
        details: accountError instanceof Error ? accountError.message : String(accountError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error("💥 Instagram connection error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get user ID from request
    let userId = await getUserIdFromRequest(req)
    
    // Also check query parameters for user ID (from client)
    if (!userId) {
      const url = new URL(req.url)
      userId = url.searchParams.get('userId')
    }
    
    if (!userId) {
      console.error("❌ No userId found in disconnect request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔗 Instagram disconnect request for user:", userId)

    // Find and delete the Instagram account connection
    const deletedAccount = await prisma.account.deleteMany({
      where: {
        userId: userId,
        provider: "instagram",
      },
    })

    if (deletedAccount.count === 0) {
      console.log("❌ No Instagram account found to disconnect for user:", userId)
      return NextResponse.json({ error: "No Instagram account found" }, { status: 404 })
    }

    console.log("✅ Instagram account disconnected successfully for user:", userId)

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected successfully",
    })

  } catch (error) {
    console.error("💥 Instagram disconnect error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
