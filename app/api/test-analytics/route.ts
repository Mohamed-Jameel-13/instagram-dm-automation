import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Test 1: Check if analytics tables exist and can be queried
    const [dmCount, postCount, performanceCount, automationLogCount] = await Promise.all([
      prisma.dmAnalytics.count().catch(e => ({ error: e.message })),
      prisma.postAnalytics.count().catch(e => ({ error: e.message })),
      prisma.performanceMetrics.count().catch(e => ({ error: e.message })),
      prisma.automationLog.count().catch(e => ({ error: e.message }))
    ])

    // Test 2: Get recent automation logs for this user
    const recentLogs = await prisma.automationLog.findMany({
      where: {
        automationId: {
          in: (await prisma.automation.findMany({
            where: { userId },
            select: { id: true }
          })).map(a => a.id)
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 10
    })

    // Test 3: Get user's automations
    const userAutomations = await prisma.automation.findMany({
      where: { userId },
      select: { id: true, name: true, active: true, triggerType: true }
    })

    // Test 4: Get recent DM analytics
    const recentDmAnalytics = await prisma.dmAnalytics.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      userId,
      tableCounts: {
        dmAnalytics: dmCount,
        postAnalytics: postCount,
        performanceMetrics: performanceCount,
        automationLog: automationLogCount
      },
      userAutomations,
      recentLogs,
      recentDmAnalytics,
      debug: {
        timestamp: new Date().toISOString(),
        tablesWorking: typeof dmCount === 'number'
      }
    })

  } catch (error) {
    console.error("Test analytics error:", error)
    return NextResponse.json(
      { error: "Test failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
