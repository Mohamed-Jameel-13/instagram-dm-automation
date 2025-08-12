import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    console.log("🔧 Fixing Instagram account ID mismatch...")
    
    // The old ID (from Basic Display API)
    const oldAccountId = "24695355950081100"
    // The new ID (from webhooks/Business API)  
    const newAccountId = "17841473518392752"
    
    // Find the account with the old ID
    const account = await prisma.account.findFirst({
      where: {
        provider: "instagram",
        providerAccountId: oldAccountId
      }
    })
    
    if (!account) {
      return NextResponse.json({
        success: false,
        error: `No account found with ID ${oldAccountId}`
      }, { status: 404 })
    }
    
    console.log(`✅ Found account: ${account.id} (User: ${account.userId})`)
    
    // Update the provider account ID to match webhooks
    const updatedAccount = await prisma.account.update({
      where: { id: account.id },
      data: {
        providerAccountId: newAccountId
      }
    })
    
    console.log(`✅ Updated account ID: ${oldAccountId} → ${newAccountId}`)
    
    // Verify the fix by checking automations
    const automations = await prisma.automation.findMany({
      where: {
        userId: account.userId,
        active: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: "Account ID mismatch fixed!",
      details: {
        oldAccountId,
        newAccountId,
        userId: account.userId,
        activeAutomations: automations.length,
        fix: "Updated stored Instagram account ID to match webhook ID"
      },
      nextSteps: [
        "Comment 'hi' on your @writesparkai post again",
        "Check logs - should now show account match instead of mismatch",
        "You should receive a private reply/DM"
      ]
    })
    
  } catch (error) {
    console.error("❌ Failed to fix account mismatch:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix account mismatch",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
