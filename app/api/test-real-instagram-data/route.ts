import { NextRequest, NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Testing with REAL Instagram webhook data")
    
    // Use the EXACT webhook data we just captured from Instagram
    const realInstagramData = {
      requestId: `real_test_${Date.now()}`,
      eventId: `real_test_${Date.now()}`,
      timestamp: Date.now(),
      body: {
        object: "instagram",
        entry: [
          {
            id: "24695355950081100", // Your Instagram business account ID
            changes: [
              {
                field: "comments",
                value: {
                  id: `${Date.now()}_unique_comment`, // Unique comment ID to bypass duplicate prevention
                  text: "no", // The keyword that should trigger
                  from: {
                    id: "1960009881070275", // Real Instagram user ID
                    username: "md._.jameel" // Real Instagram username
                  },
                  media: {
                    id: "18080571787866479" // Real media/post ID
                  },
                  parent_id: null
                }
              }
            ]
          }
        ]
      },
      signature: "real_test_signature",
      receivedAt: new Date().toISOString()
    }
    
    console.log("📝 Processing with real Instagram data:", JSON.stringify(realInstagramData.body, null, 2))
    
    // Check automation logs BEFORE processing
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const logCountBefore = await prisma.automationLog.count();
    console.log('📊 Automation logs BEFORE processing:', logCountBefore);
    
    // Process the real Instagram event
    const result = await processInstagramEvent(realInstagramData)
    
    console.log("✅ Processing result:", result)
    
    // Check automation logs AFTER processing
    const logCountAfter = await prisma.automationLog.count();
    console.log('📊 Automation logs AFTER processing:', logCountAfter);
    
    // Get recent logs to see what was created
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
      message: "Real Instagram data processing test completed",
      testData: realInstagramData,
      result: result,
      logCountBefore,
      logCountAfter,
      logsCreated: logCountAfter - logCountBefore,
      recentLogs,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Real Instagram data processing error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
