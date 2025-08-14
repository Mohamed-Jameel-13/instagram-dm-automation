import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get user's automations
    const automations = await prisma.automation.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        active: true,
        triggerType: true,
        actionType: true,
        keywords: true,
        createdAt: true
      }
    })

    // Get analytics for each automation
    const automationAnalytics = await Promise.all(
      automations.map(async (automation) => {
        // Get trigger logs
        const [triggerLogs, dmAnalytics] = await Promise.all([
          prisma.automationLog.findMany({
            where: {
              automationId: automation.id,
              triggeredAt: {
                gte: startDate
              }
            },
            orderBy: {
              triggeredAt: 'desc'
            }
          }),
          prisma.dmAnalytics.findMany({
            where: {
              automationId: automation.id,
              sentAt: {
                gte: startDate
              }
            }
          })
        ])

        // Calculate metrics
        const totalTriggers = triggerLogs.length
        const successfulTriggers = triggerLogs.filter(log => log.responseStatus === 'success').length
        const failedTriggers = triggerLogs.filter(log => log.responseStatus === 'failed').length
        
        const totalDmsSent = dmAnalytics.filter(dm => dm.status === 'sent').length
        const failedDms = dmAnalytics.filter(dm => dm.status === 'failed').length
        
        const avgResponseTime = dmAnalytics.length > 0
          ? dmAnalytics.reduce((sum, dm) => sum + dm.responseTimeMs, 0) / dmAnalytics.length
          : 0

        const fastestResponse = dmAnalytics.length > 0
          ? Math.min(...dmAnalytics.map(dm => dm.responseTimeMs))
          : null

        const slowestResponse = dmAnalytics.length > 0
          ? Math.max(...dmAnalytics.map(dm => dm.responseTimeMs))
          : null

        // Get unique recipients
        const uniqueRecipients = new Set(dmAnalytics.map(dm => dm.recipientId)).size

        // Recent activity
        const recentActivity = triggerLogs.slice(0, 10).map(log => ({
          triggeredAt: log.triggeredAt,
          triggerType: log.triggerType,
          triggerText: log.triggerText.substring(0, 50),
          responseStatus: log.responseStatus,
          processingTimeMs: log.processingTimeMs,
          postId: log.postId
        }))

        // Daily breakdown for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          return date
        }).reverse()

        const dailyBreakdown = last7Days.map(date => {
          const nextDay = new Date(date)
          nextDay.setDate(nextDay.getDate() + 1)
          
          const dayTriggers = triggerLogs.filter(log => 
            log.triggeredAt >= date && log.triggeredAt < nextDay
          ).length

          const dayDms = dmAnalytics.filter(dm => 
            dm.sentAt >= date && dm.sentAt < nextDay && dm.status === 'sent'
          ).length

          return {
            date: date.toISOString().split('T')[0],
            triggers: dayTriggers,
            dmsSent: dayDms
          }
        })

        return {
          automation: {
            id: automation.id,
            name: automation.name,
            active: automation.active,
            triggerType: automation.triggerType,
            actionType: automation.actionType,
            keywords: JSON.parse(automation.keywords || '[]'),
            createdAt: automation.createdAt
          },
          metrics: {
            totalTriggers,
            successfulTriggers,
            failedTriggers,
            totalDmsSent,
            failedDms,
            uniqueRecipients,
            avgResponseTime: Math.round(avgResponseTime),
            fastestResponse,
            slowestResponse,
            successRate: totalTriggers > 0 ? Math.round((successfulTriggers / totalTriggers) * 10000) / 100 : 0,
            dmSuccessRate: (totalDmsSent + failedDms) > 0 
              ? Math.round((totalDmsSent / (totalDmsSent + failedDms)) * 10000) / 100 
              : 0
          },
          recentActivity,
          dailyBreakdown
        }
      })
    )

    // Sort by total triggers descending
    automationAnalytics.sort((a, b) => b.metrics.totalTriggers - a.metrics.totalTriggers)

    // Calculate overall summary
    const summary = {
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.active).length,
      totalTriggers: automationAnalytics.reduce((sum, a) => sum + a.metrics.totalTriggers, 0),
      totalDmsSent: automationAnalytics.reduce((sum, a) => sum + a.metrics.totalDmsSent, 0),
      avgResponseTime: automationAnalytics.length > 0
        ? Math.round(automationAnalytics.reduce((sum, a) => sum + a.metrics.avgResponseTime, 0) / automationAnalytics.length)
        : 0,
      topPerformer: automationAnalytics.length > 0 ? automationAnalytics[0].automation.name : null
    }

    return NextResponse.json({
      automations: automationAnalytics,
      summary
    })

  } catch (error) {
    console.error("Error fetching automation analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch automation analytics" },
      { status: 500 }
    )
  }
}
