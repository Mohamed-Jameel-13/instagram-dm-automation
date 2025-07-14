import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getEnv } from "@/lib/env-server"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"
import { ensureUserExists } from "@/lib/user-utils"

export async function POST(req: NextRequest) {
  try {
    // Parse the request body first
    const body = await req.json()
    const { accessToken, instagramId, username, accountType, userId: requestUserId } = body
    
    // Prioritize user ID from request body (from Firebase Auth on client)
    let userId = requestUserId
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!accessToken || !instagramId || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the access token is valid using Basic Display API
    const testResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
    
    if (!testResponse.ok) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 400 })
    }

    const accountData = await testResponse.json()

    if (accountData.id !== instagramId) {
      return NextResponse.json({ error: "Token doesn't match provided Instagram ID" }, { status: 400 })
    }

    // Ensure the user exists in our database first
    await ensureUserExists(userId, username)

    // Save or update the Instagram account connection
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
      },
      create: {
        userId: userId,
        type: "oauth",
        provider: "instagram",
        providerAccountId: instagramId,
        access_token: accessToken,
        token_type: "bearer",
        scope: "user_profile,user_media",
      },
    })

    return NextResponse.json({
      success: true,
      account: {
        id: instagramId,
        username: username,
        accountType: accountType,
      },
    })
  } catch (error) {
    console.error("Instagram connection error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
