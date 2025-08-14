import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Use the known userId from debug data
    const userId = "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2"

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get performance metrics for the period
    const performanceMetrics = await prisma.performanceMetrics.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    // Get recent DM analytics
    const recentDmAnalytics = await prisma.dmAnalytics.findMany({
      where: {
        userId,
        sentAt: { gte: startDate }
      },
      orderBy: { sentAt: 'desc' }
    })

    // Get recent automation logs
    const recentAutomationLogs = await prisma.automationLog.findMany({
      where: {
        automationId: {
          in: (await prisma.automation.findMany({
            where: { userId },
            select: { id: true }
          })).map(a => a.id)
        },
        triggeredAt: { gte: startDate }
      },
      orderBy: { triggeredAt: 'desc' }
    })

    // Calculate summary metrics
    const totalDms = recentDmAnalytics.length
    const successfulDms = recentDmAnalytics.filter(dm => dm.status === 'sent').length
    const failedDms = recentDmAnalytics.filter(dm => dm.status === 'failed').length
    const avgResponseTime = performanceMetrics.length > 0
      ? performanceMetrics.reduce((sum, metric) => sum + metric.avgResponseTime, 0) / performanceMetrics.length
      : 0

    const totalTriggers = recentAutomationLogs.length
    const totalComments = recentAutomationLogs.filter(log => log.triggerType === 'comment').length

    // Get active automations count
    const activeAutomations = await prisma.automation.count({
      where: { userId, active: true }
    })

    return NextResponse.json({
      summary: {
        totalDms,
        successfulDms,
        failedDms,
        successRate: totalDms > 0 ? (successfulDms / totalDms) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        totalTriggers,
        totalComments,
        activeAutomations
      },
      performanceMetrics,
      recentDmAnalytics: recentDmAnalytics.slice(0, 10),
      recentAutomationLogs: recentAutomationLogs.slice(0, 10),
      debug: {
        userId,
        dateRange: { start: startDate.toISOString(), days },
        dataFound: {
          performanceMetrics: performanceMetrics.length,
          dmAnalytics: recentDmAnalytics.length,
          automationLogs: recentAutomationLogs.length
        }
      }
    })

  } catch (error) {
    console.error("Analytics overview error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
