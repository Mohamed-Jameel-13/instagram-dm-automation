import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { newAccountId } = await req.json()
    
    if (!newAccountId) {
      return NextResponse.json({ error: "Missing newAccountId" }, { status: 400 })
    }

    // Get user's current Instagram account
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram"
      }
    })

    if (!account) {
      return NextResponse.json({ 
        error: "No Instagram account found. Please connect Instagram first." 
      }, { status: 404 })
    }

    console.log(`🔄 Updating Instagram account ID from ${account.providerAccountId} to ${newAccountId}`)

    // Update the account ID
    await prisma.account.update({
      where: { id: account.id },
      data: { providerAccountId: newAccountId }
    })

    return NextResponse.json({
      success: true,
      message: `Instagram account ID updated from ${account.providerAccountId} to ${newAccountId}`,
      oldId: account.providerAccountId,
      newId: newAccountId
    })

  } catch (error) {
    console.error("Fix account ID error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
