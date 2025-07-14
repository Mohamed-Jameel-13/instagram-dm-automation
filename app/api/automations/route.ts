import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"
import { ensureUserExists } from "@/lib/user-utils"

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query parameters first (from Firebase Auth on client)
    const url = new URL(req.url)
    let userId = url.searchParams.get('userId')
    
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    // Build where clause
    const where: any = {
      active: true
    }
    
    // If user ID is provided, filter by user
    if (userId) {
      where.userId = userId
    }
    
    // Get automations with user details
    const automations = await prisma.automation.findMany({
      where,
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

    // Transform automations to include display type
    const transformedAutomations = automations.map(automation => ({
      ...automation,
      keywords: JSON.parse(automation.keywords || '[]'),
      type: automation.actionType === 'ai' ? 'Smart AI' : 'Message Reply'
    }))

    console.log(`📋 Serving ${transformedAutomations.length} active automations${userId ? ` for user ${userId}` : ' to worker'}`)

    return NextResponse.json({ automations: transformedAutomations })

  } catch (error) {
    console.error("Error fetching automations:", error)
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    )
  }
}

// Create new automation
export async function POST(req: NextRequest) {
  try {
    // Parse request body first
    const body = await req.json()
    const { name, keywords, actionType, triggerType, message, active, userId: requestUserId } = body
    
    // Prioritize user ID from request body (from Firebase Auth on client)
    let userId = requestUserId
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure the user exists in our database first
    await ensureUserExists(userId)

    // Create the automation
    const automation = await prisma.automation.create({
      data: {
        name: name || "Untitled Automation",
        keywords: JSON.stringify(keywords || []),
        actionType: actionType || "message",
        triggerType: triggerType || "dm",
        message: message || "",
        posts: JSON.stringify([]),
        active: active || false,
        userId: userId,
        dmMode: "normal"
      }
    })

    // Return the created automation in the expected format
    const responseAutomation = {
      id: automation.id,
      name: automation.name,
      keywords: JSON.parse(automation.keywords),
      actionType: automation.actionType,
      triggerType: automation.triggerType,
      message: automation.message,
      active: automation.active,
      dmMode: automation.dmMode,
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString(),
      type: automation.actionType === "ai" ? "Smart AI" : "Standard",
    }

    console.log(`✅ Created automation ${automation.id} for user ${userId}`)

    return NextResponse.json({ 
      success: true,
      automation: responseAutomation
    })

  } catch (error) {
    console.error("Error creating automation:", error)
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    )
  }
}
