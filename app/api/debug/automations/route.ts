import { type NextRequest, NextResponse } from "next/server"
// Debug route - development only
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // This is a debug route - use with caution in production
  const userId = "firebase-user-id" // Debug only - should be replaced with real auth
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all automations for the user
    const automations = await prisma.automation.findMany({
      where: {
        userId: userId,
      },
      include: {
        user: true,
      },
    })

    // Get user's Instagram account info
    const instagramAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram",
      },
    })

    // Transform automations to show parsed data
    const debugInfo = {
      user: {
        id: userId,
        email: "firebase-user@example.com", // TODO: Get from Firebase Auth
      },
      instagramAccount: instagramAccount ? {
        id: instagramAccount.id,
        providerAccountId: instagramAccount.providerAccountId,
        hasAccessToken: !!instagramAccount.access_token,
      } : null,
      automations: automations.map(automation => ({
        id: automation.id,
        name: automation.name,
        active: automation.active,
        triggerType: automation.triggerType,
        actionType: automation.actionType,
        keywords: JSON.parse(automation.keywords || "[]"),
        posts: JSON.parse(automation.posts || "[]"),
        message: automation.message,
        commentReply: automation.commentReply,
        aiPrompt: automation.aiPrompt,
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt,
      }))
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ 
      error: "Failed to fetch debug info",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
