import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Get all active automations with user details
    const automations = await prisma.automation.findMany({
      where: {
        active: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    console.log(`📋 Serving ${automations.length} active automations to worker`)

    return NextResponse.json(automations)

  } catch (error) {
    console.error("Error fetching automations:", error)
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    )
  }
}

// Optional: Get automations for specific user
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    const automations = await prisma.automation.findMany({
      where: {
        userId,
        active: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(automations)

  } catch (error) {
    console.error("Error fetching user automations:", error)
    return NextResponse.json(
      { error: "Failed to fetch user automations" },
      { status: 500 }
    )
  }
}
