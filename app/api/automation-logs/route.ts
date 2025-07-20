import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { 
      automationId, 
      triggerType, 
      triggerText, 
      userId, 
      username,
      timestamp 
    } = await req.json()

    // Create automation log entry
    const log = await prisma.automationLog.create({
      data: {
        automationId,
        triggerType,
        triggerText,
        userId,
        username: username || null,
        isNewFollower: false,
        triggeredAt: timestamp ? new Date(timestamp) : new Date(),
      }
    })

    console.log(`📝 Logged automation trigger: ${automationId} - ${triggerType}`)

    return NextResponse.json(log)

  } catch (error) {
    console.error("Error creating automation log:", error)
    return NextResponse.json(
      { error: "Failed to create automation log" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const automationId = searchParams.get('automationId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where = automationId ? { automationId } : {}

    const logs = await prisma.automationLog.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      include: {
        automation: {
          select: {
            id: true,
            name: true,
            triggerType: true
          }
        }
      }
    })

    return NextResponse.json(logs)

  } catch (error) {
    console.error("Error fetching automation logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch automation logs" },
      { status: 500 }
    )
  }
} 