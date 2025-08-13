import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

type ActivityPoint = {
  day: string
  count: number
}

function getLast7Days(): { key: string; label: string; date: Date }[] {
  const days: { key: string; label: string; date: Date }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    const label = d.toLocaleDateString(undefined, { weekday: "short" })
    days.push({ key, label, date: d })
  }
  return days
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    let userId = url.searchParams.get("userId")
    if (!userId) {
      userId = await getUserIdFromRequest(req)
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const days = getLast7Days()
    const startDate = new Date(days[0].date)

    // Get automations for this owner and fetch logs by automation IDs (some logs may have stored the Instagram user's ID in userId)
    const userAutomations = await prisma.automation.findMany({
      where: { userId },
      select: { id: true },
    })
    const automationIds = userAutomations.map(a => a.id)

    const [logs, totalAutomations, activeAutomations, newFollowers, activeConversations] = await Promise.all([
      prisma.automationLog.findMany({
        where: {
          automationId: { in: automationIds },
          triggeredAt: { gte: startDate },
        },
        select: {
          triggerType: true,
          triggeredAt: true,
        },
      }),
      prisma.automation.count({ where: { userId } }),
      prisma.automation.count({ where: { userId, active: true } }),
      prisma.follower.count({ where: { userId, followedAt: { gte: startDate } } }),
      prisma.conversationSession.count({ where: { userId, isActive: true } }),
    ])

    const dmTypes = new Set(["dm", "dm_conversation"]) as Set<string>
    const commentTypes = new Set(["comment", "follow_comment"]) as Set<string>

    let dmCount = 0
    let commentCount = 0
    const byDay: Record<string, number> = {}
    days.forEach((d) => (byDay[d.key] = 0))

    for (const log of logs) {
      const key = new Date(log.triggeredAt)
        .toISOString()
        .slice(0, 10)
      if (byDay[key] !== undefined) {
        byDay[key] += 1
      }
      if (dmTypes.has(log.triggerType)) dmCount += 1
      if (commentTypes.has(log.triggerType)) commentCount += 1
    }

    const activity: ActivityPoint[] = days.map((d) => ({ day: d.label, count: byDay[d.key] || 0 }))

    return NextResponse.json({
      activity,
      totals: {
        dm: dmCount,
        comments: commentCount,
        automations: totalAutomations,
        activeAutomations,
        newFollowers,
        activeConversations,
      },
      window: {
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error building dashboard data:", error)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}


