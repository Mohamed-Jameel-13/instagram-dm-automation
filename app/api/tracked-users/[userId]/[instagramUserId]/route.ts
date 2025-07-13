import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; instagramUserId: string } }
) {
  try {
    const { userId, instagramUserId } = params

    const trackedUser = await prisma.trackedUser.findUnique({
      where: {
        userId_instagramUserId: {
          userId,
          instagramUserId
        }
      }
    })

    if (!trackedUser) {
      return NextResponse.json(
        { error: "Tracked user not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(trackedUser)

  } catch (error) {
    console.error("Error fetching tracked user:", error)
    return NextResponse.json(
      { error: "Failed to fetch tracked user" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string; instagramUserId: string } }
) {
  try {
    const { userId, instagramUserId } = params
    const { status } = await req.json()

    const trackedUser = await prisma.trackedUser.update({
      where: {
        userId_instagramUserId: {
          userId,
          instagramUserId
        }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    console.log(`🔄 Updated tracked user ${instagramUserId} to status: ${status}`)

    return NextResponse.json(trackedUser)

  } catch (error) {
    console.error("Error updating tracked user:", error)
    return NextResponse.json(
      { error: "Failed to update tracked user" },
      { status: 500 }
    )
  }
} 