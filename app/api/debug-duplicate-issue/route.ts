import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { GlobalDuplicatePrevention } from "@/lib/global-duplicate-prevention"

export async function GET(req: NextRequest) {
  const requestId = `debug_${Date.now()}`
  
  try {
    console.log(`🔍 [${requestId}] Debugging duplicate DM issue...`)
    
    // 1. Check active automations
    const automations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        userId: true,
        triggerType: true,
        keywords: true,
        message: true,
        commentReply: true,
        actionType: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // 2. Check recent automation logs (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentLogs = await prisma.automationLog.findMany({
      where: {
        triggeredAt: { gte: tenMinutesAgo }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 20
    })
    
    // 3. Get global duplicate prevention stats
    const globalStats = GlobalDuplicatePrevention.getStats()
    
    // 4. Look for potential issues
    const issues = []
    
    // Check for duplicate automations
    const autoGroups = new Map()
    automations.forEach(auto => {
      const key = `${auto.userId}_${auto.triggerType}_${auto.keywords}`
      if (!autoGroups.has(key)) {
        autoGroups.set(key, [])
      }
      autoGroups.get(key).push(auto)
    })
    
    for (const [key, group] of autoGroups.entries()) {
      if (group.length > 1) {
        issues.push({
          type: "DUPLICATE_AUTOMATION",
          message: `Found ${group.length} automations with same trigger: ${key}`,
          automations: group
        })
      }
    }
    
    // Check for recent duplicate logs
    const logGroups = new Map()
    recentLogs.forEach(log => {
      const key = `${log.userId}_${log.triggerText}_${log.automationId}`
      if (!logGroups.has(key)) {
        logGroups.set(key, [])
      }
      logGroups.get(key).push(log)
    })
    
    for (const [key, group] of logGroups.entries()) {
      if (group.length > 1) {
        issues.push({
          type: "DUPLICATE_LOG_ENTRIES",
          message: `Found ${group.length} duplicate log entries: ${key}`,
          logs: group,
          timeGaps: group.length > 1 ? group.map((log: any, i: number) => {
            if (i === 0) return null
            return new Date(group[i-1].triggeredAt).getTime() - new Date(log.triggeredAt).getTime()
          }).filter(Boolean) : []
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      requestId,
      
      summary: {
        activeAutomations: automations.length,
        recentLogEntries: recentLogs.length,
        globalCacheEntries: globalStats.totalKeys,
        issuesFound: issues.length
      },
      
      activeAutomations: automations.map(auto => ({
        id: auto.id,
        name: auto.name,
        userId: auto.userId,
        type: auto.triggerType,
        keywords: auto.keywords,
        hasMessage: !!auto.message,
        hasCommentReply: !!auto.commentReply,
        messageLength: auto.message?.length || 0
      })),
      
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        automationId: log.automationId,
        userId: log.userId,
        username: log.username,
        triggerText: log.triggerText,
        triggerType: log.triggerType,
        triggeredAt: log.triggeredAt,
        isNewFollower: log.isNewFollower
      })),
      
      globalStats,
      
      issues,
      
      recommendations: [
        issues.length === 0 ? "✅ No obvious issues found" : `⚠️ Found ${issues.length} potential issues`,
        "Test by commenting on a post and monitor this endpoint",
        "Check if global duplicate prevention is blocking messages",
        "Verify only one automation is active for your trigger words"
      ],
      
      testInstructions: [
        "1. Comment on your Instagram post with trigger keyword",
        "2. Immediately call this endpoint again to see new logs",
        "3. Check if duplicate log entries appear",
        "4. Verify global cache is working"
      ]
    })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Debug failed:`, error)
    return NextResponse.json(
      { error: "Debug failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
