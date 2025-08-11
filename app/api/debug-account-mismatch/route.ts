import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Debugging Instagram account mismatch issue")
    
    // Get all Instagram accounts in the database
    const instagramAccounts = await prisma.account.findMany({
      where: {
        provider: "instagram"
      },
      select: {
        id: true,
        userId: true,
        providerAccountId: true,
        access_token: true,
        scope: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${instagramAccounts.length} Instagram accounts`)
    
    // Get all automations
    const automations = await prisma.automation.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        userId: true,
        triggerType: true,
        keywords: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${automations.length} active automations`)
    
    // Real Instagram webhook data
    const realWebhookAccountId = "24695355950081100" // From real webhook
    
    return NextResponse.json({
      success: true,
      analysis: {
        realWebhookAccountId,
        instagramAccounts: instagramAccounts.map(acc => ({
          userId: acc.userId,
          userEmail: acc.user.email,
          userName: acc.user.name,
          providerAccountId: acc.providerAccountId,
          matches: acc.providerAccountId === realWebhookAccountId,
          hasBusinessScopes: acc.scope?.includes("instagram_manage_messages") || acc.scope?.includes("instagram_manage_comments")
        })),
        automations: automations.map(auto => ({
          automationId: auto.id,
          userId: auto.userId,
          userEmail: auto.user.email,
          triggerType: auto.triggerType,
          keywords: auto.keywords
        })),
        mismatchAnalysis: {
          message: "If no Instagram accounts match the real webhook account ID, this explains why automations don't trigger",
          realWebhookAccountId,
          accountMatches: instagramAccounts.filter(acc => acc.providerAccountId === realWebhookAccountId).length
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Account mismatch debug error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
