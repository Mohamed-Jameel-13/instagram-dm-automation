import { NextRequest, NextResponse } from "next/server"
import { handleInstagramComment } from "@/lib/instagram-processor"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Testing handleInstagramComment directly with real data")
    
    // Real Instagram comment data that should trigger the automation
    const realCommentData = {
      id: `${Date.now()}_direct_test`, // Unique comment ID
      text: "no", // This should match the "no" keyword automation
      from: {
        id: "1960009881070275", // Real Instagram user ID
        username: "md._.jameel" // Real username
      },
      media: {
        id: "18080571787866479" // Real media ID
      },
      parent_id: null // Top-level comment
    }
    
    const requestId = `direct_test_${Date.now()}`
    const instagramAccountId = "24695355950081100" // Matches the user's account
    
    console.log("📝 Calling handleInstagramComment directly with:")
    console.log("- Comment data:", JSON.stringify(realCommentData, null, 2))
    console.log("- Request ID:", requestId)
    console.log("- Instagram account ID:", instagramAccountId)
    
    // Call the function directly - this should create automation logs if working
    const result = await handleInstagramComment(realCommentData, requestId, instagramAccountId)
    
    console.log("✅ Direct processing result:", result)
    
    // Check automation logs after processing
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const logCount = await prisma.automationLog.count();
    console.log('📊 Total automation logs after direct processing:', logCount);
    
    // Get recent logs
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
    console.log('📋 Recent automation logs:', recentLogs);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      message: "Direct handleInstagramComment test completed",
      result,
      logCount,
      recentLogs,
      testData: {
        requestId,
        instagramAccountId,
        commentData: realCommentData
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Direct comment processing error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
