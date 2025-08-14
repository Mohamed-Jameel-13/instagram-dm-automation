import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    let userId = await getUserIdFromRequest(req)
    
    // TEMPORARY FIX: If no user ID from auth, use the known user ID from database
    if (!userId) {
      console.log("Debug DM Analytics: No userId from auth, using default user")
      userId = "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2"
    }
    
    console.log(`Debug DM Analytics: Using userId ${userId}`)

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all DM analytics to see the data structure
    const allDms = await prisma.dmAnalytics.findMany({
      where: {
        userId,
        sentAt: { gte: startDate }
      },
      select: {
        id: true,
        triggerType: true,
        triggerSource: true,
        status: true,
        responseTimeMs: true,
        sentAt: true,
        aiPrompt: true
      },
      orderBy: { sentAt: 'desc' },
      take: 50
    })

    // Get trigger type breakdown
    const triggerTypeBreakdown = await prisma.dmAnalytics.groupBy({
      by: ['triggerType'],
      where: {
        userId,
        sentAt: { gte: startDate }
      },
      _count: {
        triggerType: true
      }
    })

    // Get status breakdown
    const statusBreakdown = await prisma.dmAnalytics.groupBy({
      by: ['status'],
      where: {
        userId,
        sentAt: { gte: startDate }
      },
      _count: {
        status: true
      }
    })

    // Count totals using different methods
    const totalDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        sentAt: { gte: startDate }
      }
    })

    const aiDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        triggerType: 'ai_dm',
        sentAt: { gte: startDate }
      }
    })

    const regularDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        triggerType: 'dm',
        sentAt: { gte: startDate }
      }
    })

    // Also check for other possible triggerType values
    const commentDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        triggerType: 'comment',
        sentAt: { gte: startDate }
      }
    })

    const followCommentDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        triggerType: 'follow_comment',
        sentAt: { gte: startDate }
      }
    })

    // Check what the current overview calculation would return
    const allNonAiDmsCount = await prisma.dmAnalytics.count({
      where: {
        userId,
        triggerType: {
          in: ['dm', 'comment', 'follow_comment']
        },
        sentAt: { gte: startDate }
      }
    })

    // Get all unique triggerType values in the database
    const allTriggerTypes = await prisma.dmAnalytics.findMany({
      where: { userId },
      select: { triggerType: true },
      distinct: ['triggerType']
    })

    return NextResponse.json({
      summary: {
        totalDms: totalDmsCount,
        aiDms: aiDmsCount,
        regularDms: regularDmsCount,
        commentDms: commentDmsCount,
        followCommentDms: followCommentDmsCount,
        allNonAiDms: allNonAiDmsCount,
        dateRange: `${startDate.toISOString()} to ${new Date().toISOString()}`,
        calculatedSplit: {
          ai: aiDmsCount,
          nonAi: allNonAiDmsCount,
          total: aiDmsCount + allNonAiDmsCount,
          shouldEqualTotal: totalDmsCount
        }
      },
      allTriggerTypes: allTriggerTypes.map(t => t.triggerType),
      triggerTypeBreakdown,
      statusBreakdown,
      sampleDms: allDms.map(dm => ({
        ...dm,
        hasAiPrompt: !!dm.aiPrompt,
        shortId: dm.id.slice(-8)
      }))
    })

  } catch (error) {
    console.error("Error debugging DM analytics:", error)
    return NextResponse.json(
      { error: "Failed to debug DM analytics" },
      { status: 500 }
    )
  }
}
