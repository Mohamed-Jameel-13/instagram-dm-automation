import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `disable_dup_${Date.now()}`
  
  try {
    console.log(`🔧 [${requestId}] Disabling duplicate automations...`)
    
    // Disable the "Untitled Automation" that belongs to a different user
    const duplicateAutomation = await prisma.automation.updateMany({
      where: {
        id: "cmd3a1pve000bl704v3s160ag", // The specific ID of the duplicate automation
        userId: "PGFyRBSZifPHUaoyPq01IxDePa93" // Different user
      },
      data: {
        active: false
      }
    })
    
    console.log(`🔧 [${requestId}] Disabled ${duplicateAutomation.count} duplicate automations`)
    
    // Get updated automation list
    const activeAutomations = await prisma.automation.findMany({
      where: { 
        active: true,
        triggerType: "comment"
      },
      select: {
        id: true,
        name: true,
        userId: true,
        keywords: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: "Duplicate automation disabled successfully",
      disabledCount: duplicateAutomation.count,
      remainingActiveCommentAutomations: activeAutomations,
      recommendation: "Test commenting 'hello' again - you should now receive only one response"
    })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to disable duplicate automation:`, error)
    return NextResponse.json(
      { error: "Failed to disable duplicate automation", details: error.message },
      { status: 500 }
    )
  }
} 