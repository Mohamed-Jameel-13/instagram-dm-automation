import { NextRequest, NextResponse } from "next/server"
import { handleInstagramComment } from "@/lib/instagram-processor"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 SIMPLE DEBUG: Testing handleInstagramComment with minimal data")
    
    // Use completely unique data to avoid any duplicate prevention
    const timestamp = Date.now()
    const uniqueId = `debug_simple_${timestamp}`
    
    const realCommentData = {
      id: uniqueId, // Completely unique comment ID
      text: "no", // This should match the automation
      from: {
        id: "1960009881070275", // Real Instagram user ID
        username: "md._.jameel" // Real username
      },
      media: {
        id: "18080571787866479" // Real media ID
      },
      parent_id: null // Top-level comment
    }
    
    const requestId = `debug_${timestamp}`
    const instagramAccountId = "24695355950081100" // Matches user's account
    
    console.log("🚀 SIMPLE DEBUG: Starting with:")
    console.log("- Comment ID:", realCommentData.id)
    console.log("- User ID:", realCommentData.from.id)
    console.log("- Text:", realCommentData.text)
    console.log("- Instagram Account ID:", instagramAccountId)
    
    // Step 1: Check if we can access the database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log("✅ Step 1: Database connection successful")
    
    // Step 2: Check if automations exist
    const automations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        triggerType: true,
        keywords: true,
        userId: true,
        message: true
      }
    });
    
    console.log(`✅ Step 2: Found ${automations.length} active automations`)
    automations.forEach(auto => {
      console.log(`  - ${auto.id}: ${auto.triggerType}, keywords: ${auto.keywords}`)
    })
    
    // Step 3: Check if we can find comment automations
    const commentAutomations = automations.filter(a => 
      a.triggerType === "comment" || a.triggerType === "follow_comment"
    )
    
    console.log(`✅ Step 3: Found ${commentAutomations.length} comment automations`)
    
    // Step 4: Try calling handleInstagramComment with detailed logging
    console.log("🚀 Step 4: Calling handleInstagramComment...")
    
    try {
      await handleInstagramComment(realCommentData, requestId, instagramAccountId)
      console.log("✅ Step 4: handleInstagramComment completed without error")
    } catch (error) {
      console.error("❌ Step 4: handleInstagramComment threw error:", error)
      return NextResponse.json({
        success: false,
        error: "handleInstagramComment failed",
        details: error instanceof Error ? error.message : String(error),
        steps: {
          step1: "✅ Database connection successful",
          step2: `✅ Found ${automations.length} active automations`,
          step3: `✅ Found ${commentAutomations.length} comment automations`,
          step4: "❌ handleInstagramComment failed"
        }
      }, { status: 500 })
    }
    
    // Step 5: Check if any logs were created
    const newLogs = await prisma.automationLog.findMany({
      where: {
        userId: realCommentData.from.id
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    })
    
    await prisma.$disconnect()
    
    console.log(`✅ Step 5: Found ${newLogs.length} logs for this user`)
    
    return NextResponse.json({
      success: true,
      message: "Simple debug flow completed",
      steps: {
        step1: "✅ Database connection successful",
        step2: `✅ Found ${automations.length} active automations`,
        step3: `✅ Found ${commentAutomations.length} comment automations`,
        step4: "✅ handleInstagramComment completed",
        step5: `✅ Found ${newLogs.length} logs for user`
      },
      testData: {
        commentData: realCommentData,
        requestId,
        instagramAccountId,
        automationsFound: automations.length,
        commentAutomationsFound: commentAutomations.length,
        logsFound: newLogs.length
      },
      recentLogs: newLogs,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("💥 Simple debug error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
