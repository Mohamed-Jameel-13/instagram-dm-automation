import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `fix_account_${Date.now()}`
  
  try {
    console.log(`🔧 [${requestId}] Fixing Instagram account ID mismatch...`)
    
    // Your current user ID
    const userId = "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2"
    
    // Account IDs
    const oldAccountId = "24695355950081100" // From database
    const newAccountId = "17841473518392752" // From webhooks
    
    // 1. Check current Instagram account
    const currentAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: "instagram"
      }
    })
    
    if (!currentAccount) {
      throw new Error("No Instagram account found")
    }
    
    console.log(`🔧 [${requestId}] Current account: ${currentAccount.providerAccountId}`)
    
    // 2. Update the Instagram account ID to match webhooks
    if (currentAccount.providerAccountId === oldAccountId) {
      const updatedAccount = await prisma.account.update({
        where: { id: currentAccount.id },
        data: {
          providerAccountId: newAccountId
        }
      })
      
      console.log(`🔧 [${requestId}] Updated Instagram account ID: ${oldAccountId} → ${newAccountId}`)
      
      return NextResponse.json({
        success: true,
        message: "Instagram account ID updated successfully",
        changes: {
          oldAccountId,
          newAccountId,
          accountUpdated: true
        },
        nextSteps: [
          "1. The database now matches the webhook account ID",
          "2. Try commenting 'hello' on Instagram again",
          "3. Your automations should now work properly"
        ]
      })
    } else {
      return NextResponse.json({
        success: true,
        message: "Account ID already matches or needs manual review",
        currentAccountId: currentAccount.providerAccountId,
        webhookAccountId: newAccountId,
        needsManualFix: currentAccount.providerAccountId !== newAccountId
      })
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to fix account mismatch:`, error)
    return NextResponse.json(
      { error: "Failed to fix account mismatch", details: error.message },
      { status: 500 }
    )
  }
} 