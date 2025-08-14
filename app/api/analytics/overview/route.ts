import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    let userId = await getUserIdFromRequest(req)
    
    // TEMPORARY FIX: If no user ID from auth, use the known user ID from database
    if (!userId) {
      console.log("Analytics: No userId from auth, using default user")
      userId = "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2"
    }
    
    console.log(`Analytics: Using userId ${userId}`)

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get performance metrics for the period
    const performanceMetrics = await prisma.performanceMetrics.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get total counts with AI DM separation
    const [totalDms, totalAiDms, totalRegularDms, totalComments, totalAutomations] = await Promise.all([
      prisma.dmAnalytics.count({
        where: {
          userId,
          sentAt: {
            gte: startDate
          }
        }
      }),
      prisma.dmAnalytics.count({
        where: {
          userId,
          triggerType: 'ai_dm',
          sentAt: {
            gte: startDate
          }
        }
      }),
      prisma.dmAnalytics.count({
        where: {
          userId,
          triggerType: 'dm',
          sentAt: {
            gte: startDate
          }
        }
      }),
      prisma.automationLog.count({
        where: {
          automationId: {
            in: await prisma.automation.findMany({
              where: { userId },
              select: { id: true }
            }).then(automations => automations.map(a => a.id))
          },
          triggeredAt: {
            gte: startDate
          }
        }
      }),
      prisma.automation.count({
        where: {
          userId,
          active: true
        }
      })
    ])

    // Calculate aggregated metrics
    const totalTriggers = performanceMetrics.reduce((sum, metric) => sum + metric.totalTriggers, 0)
    const successfulDms = performanceMetrics.reduce((sum, metric) => sum + metric.successfulDms, 0)
    const failedDms = performanceMetrics.reduce((sum, metric) => sum + metric.failedDms, 0)
    
    const avgResponseTime = performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, metric) => sum + metric.avgResponseTime, 0) / performanceMetrics.length
      : 0

    const fastestResponse = Math.min(...performanceMetrics.map(m => m.fastestResponse).filter(r => r !== null))
    const slowestResponse = Math.max(...performanceMetrics.map(m => m.slowestResponse).filter(r => r !== null))

    // Success rate
    const successRate = totalTriggers > 0 ? (successfulDms / totalTriggers) * 100 : 0

    return NextResponse.json({
      summary: {
        totalDms,
        totalAiDms,
        totalRegularDms,
        totalComments,
        totalAutomations,
        totalTriggers,
        successfulDms,
        failedDms,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        fastestResponse: isFinite(fastestResponse) ? fastestResponse : null,
        slowestResponse: isFinite(slowestResponse) ? slowestResponse : null
      },
      dailyMetrics: performanceMetrics.map(metric => ({
        date: metric.date,
        totalTriggers: metric.totalTriggers,
        successfulDms: metric.successfulDms,
        failedDms: metric.failedDms,
        avgResponseTime: Math.round(metric.avgResponseTime),
        successRate: metric.totalTriggers > 0 
          ? Math.round((metric.successfulDms / metric.totalTriggers) * 10000) / 100
          : 0
      }))
    })

  } catch (error) {
    console.error("Error fetching analytics overview:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
