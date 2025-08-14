import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Skip auth for debugging - get all data
    console.log("🔍 Debug Analytics API called")

    // Test 1: Basic table counts
    const [dmCount, postCount, performanceCount, automationLogCount] = await Promise.all([
      prisma.dmAnalytics.count(),
      prisma.postAnalytics.count(), 
      prisma.performanceMetrics.count(),
      prisma.automationLog.count()
    ])

    // Test 2: Get all recent entries (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const [recentDmAnalytics, recentAutomationLogs, recentPerformanceMetrics] = await Promise.all([
      prisma.dmAnalytics.findMany({
        where: { sentAt: { gte: yesterday } },
        orderBy: { sentAt: 'desc' },
        take: 10
      }),
      prisma.automationLog.findMany({
        where: { triggeredAt: { gte: yesterday } },
        orderBy: { triggeredAt: 'desc' },
        take: 10
      }),
      prisma.performanceMetrics.findMany({
        where: { date: { gte: yesterday } },
        orderBy: { date: 'desc' },
        take: 5
      })
    ])

    // Test 3: Get all users and their automations
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
      take: 5
    })

    const automations = await prisma.automation.findMany({
      select: { id: true, name: true, userId: true, active: true, triggerType: true },
      take: 10
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tableCounts: {
        dmAnalytics: dmCount,
        postAnalytics: postCount,
        performanceMetrics: performanceCount,
        automationLog: automationLogCount
      },
      recentData: {
        dmAnalytics: recentDmAnalytics,
        automationLogs: recentAutomationLogs,
        performanceMetrics: recentPerformanceMetrics
      },
      systemData: {
        users: users,
        automations: automations
      },
      debug: {
        databaseConnected: true,
        tablesAccessible: true
      }
    })

  } catch (error) {
    console.error("Debug analytics error:", error)
    return NextResponse.json(
      { 
        error: "Debug failed", 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
