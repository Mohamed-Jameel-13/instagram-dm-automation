import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // Get user's Instagram account information
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram",
      },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        scope: true,
        expires_at: true,
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: "Instagram account not found" },
        { status: 404 }
      )
    }

    console.log(`📱 Serving Instagram account for user ${userId}`)

    return NextResponse.json(account)

  } catch (error) {
    console.error("Error fetching Instagram account:", error)
    return NextResponse.json(
      { error: "Failed to fetch Instagram account" },
      { status: 500 }
    )
  }
} 