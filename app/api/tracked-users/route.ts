import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { userId, instagramUserId, status } = await req.json()

    // Create new tracked user
    const trackedUser = await prisma.trackedUser.create({
      data: {
        userId,
        instagramUserId,
        status: status || "first_commenter"
      }
    })

    console.log(`👤 Created tracked user: ${instagramUserId} with status ${status}`)

    return NextResponse.json(trackedUser)

  } catch (error) {
    console.error("Error creating tracked user:", error)
    return NextResponse.json(
      { error: "Failed to create tracked user" },
      { status: 500 }
    )
  }
} 