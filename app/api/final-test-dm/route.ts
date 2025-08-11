import { NextRequest, NextResponse } from "next/server"
import { handleInstagramComment } from "@/lib/instagram-processor"

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 FINAL TEST: Complete Instagram comment to DM flow with fresh data")
    
    // Use completely unique data to avoid any duplicate prevention
    const timestamp = Date.now()
    const uniqueId = `final_test_${timestamp}`
    
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
    
    const requestId = uniqueId
    const instagramAccountId = "24695355950081100" // Matches user's account
    
    console.log("🚀 FINAL TEST: Processing comment with fresh unique ID")
    console.log("- Comment ID:", realCommentData.id)
    console.log("- User ID:", realCommentData.from.id)
    console.log("- Username:", realCommentData.from.username)
    console.log("- Text:", realCommentData.text)
    
    // Get automation logs count BEFORE processing
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const logCountBefore = await prisma.automationLog.count();
    
    // Call handleInstagramComment directly with fresh data
    const result = await handleInstagramComment(realCommentData, requestId, instagramAccountId)
    
    // Get automation logs count AFTER processing
    const logCountAfter = await prisma.automationLog.count();
    const newLogsCreated = logCountAfter - logCountBefore;
    
    // Get the most recent logs
    const recentLogs = await prisma.automationLog.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        automationId: true,
        triggerType: true,
        triggerText: true,
        userId: true,
        username: true,
        createdAt: true
      }
    });
    
    await prisma.$disconnect();
    
    console.log("✅ FINAL TEST RESULTS:")
    console.log(`- Processing completed successfully`)
    console.log(`- New logs created: ${newLogsCreated}`)
    console.log(`- Total logs after: ${logCountAfter}`)
    
    return NextResponse.json({
      success: true,
      message: "Final Instagram DM automation test completed",
      testResults: {
        processingCompleted: true,
        logCountBefore,
        logCountAfter,
        newLogsCreated,
        messageExpected: newLogsCreated > 0 ? "DM should have been sent!" : "No automation triggered"
      },
      recentLogs,
      testData: {
        requestId,
        instagramAccountId,
        commentData: realCommentData
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Final test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
