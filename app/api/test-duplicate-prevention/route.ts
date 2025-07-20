import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { DuplicateResponsePrevention } from "@/lib/duplicate-prevention"

export async function GET(req: NextRequest) {
  const requestId = `test_duplicates_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Testing duplicate prevention system...`)
    
    // 1. Test in-memory duplicate detection
    const testEventData = {
      entry: [{
        changes: [{
          field: "comments",
          value: {
            comment_id: "test_comment_123",
            text: "hello test",
            from: { id: "test_user_456" }
          }
        }]
      }]
    }
    
    const eventId = DuplicateResponsePrevention.generateEventId(testEventData)
    console.log(`🔍 [${requestId}] Generated event ID: ${eventId}`)
    
    // First call should return false (not processed)
    const isProcessed1 = DuplicateResponsePrevention.isEventAlreadyProcessed(eventId)
    console.log(`🔍 [${requestId}] First check (should be false): ${isProcessed1}`)
    
    // Mark as processed
    DuplicateResponsePrevention.markEventProcessed(eventId, "test_result")
    
    // Second call should return true (already processed)
    const isProcessed2 = DuplicateResponsePrevention.isEventAlreadyProcessed(eventId)
    console.log(`🔍 [${requestId}] Second check (should be true): ${isProcessed2}`)
    
    // 2. Test automation selection
    const testAutomations = [
      {
        id: "auto1",
        userId: "user123",
        triggerType: "comment",
        keywords: ["hello", "hi"],
        active: true,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        id: "auto2", 
        userId: "user123",
        triggerType: "comment",
        keywords: ["hello"],
        active: true,
        createdAt: new Date() // newest
      }
    ]
    
    const bestMatch = await DuplicateResponsePrevention.getBestMatchingAutomation(
      testAutomations,
      "hello world",
      "user123",
      "comment"
    )
    
    console.log(`🎯 [${requestId}] Best matching automation: ${bestMatch?.id} (should be auto2 - newest)`)
    
    // 3. Check current active automations
    const activeAutomations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        userId: true,
        triggerType: true,
        keywords: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // 4. Check for potential duplicates
    const duplicateGroups = new Map()
    activeAutomations.forEach(auto => {
      const key = `${auto.userId}_${auto.triggerType}_${auto.keywords}`
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, [])
      }
      duplicateGroups.get(key).push(auto)
    })
    
    const duplicates = []
    for (const [key, group] of duplicateGroups.entries()) {
      if (group.length > 1) {
        duplicates.push({
          key,
          count: group.length,
          automations: group
        })
      }
    }
    
    // 5. Check recent automation logs for duplicates
    const recentLogs = await prisma.automationLog.findMany({
      where: {
        triggeredAt: {
          gte: new Date(Date.now() - 3600000) // Last hour
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 20
    })
    
    // Group logs by trigger text and user to find potential duplicates
    const logGroups = new Map()
    recentLogs.forEach(log => {
      const key = `${log.userId}_${log.triggerText}`
      if (!logGroups.has(key)) {
        logGroups.set(key, [])
      }
      logGroups.get(key).push(log)
    })
    
    const recentDuplicates = []
    for (const [key, group] of logGroups.entries()) {
      if (group.length > 1) {
        recentDuplicates.push({
          key,
          count: group.length,
          logs: group
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Duplicate prevention system test completed",
      results: {
        inMemoryDetection: {
          eventId,
          firstCheck: isProcessed1,
          secondCheck: isProcessed2,
          working: !isProcessed1 && isProcessed2
        },
        automationSelection: {
          testAutomations: testAutomations.length,
          bestMatch: bestMatch?.id,
          working: bestMatch?.id === "auto2"
        },
        currentState: {
          activeAutomations: activeAutomations.length,
          duplicateGroups: duplicates.length,
          duplicates: duplicates
        },
        recentActivity: {
          recentLogs: recentLogs.length,
          recentDuplicates: recentDuplicates.length,
          duplicateDetails: recentDuplicates
        }
      },
      recommendations: [
        duplicates.length > 0 ? "⚠️ Found duplicate automations - run /api/cleanup-duplicates" : "✅ No duplicate automations found",
        recentDuplicates.length > 0 ? "⚠️ Recent duplicate responses detected in logs" : "✅ No recent duplicate responses",
        "🧪 Test by commenting with a keyword to verify single response",
        "📊 Monitor automation logs after testing"
      ]
    })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Test failed:`, error)
    return NextResponse.json(
      { error: "Test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
