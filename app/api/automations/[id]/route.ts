import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const automation = await prisma.automation.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    }

    const transformedAutomation = {
      id: automation.id,
      name: automation.name,
      keywords: JSON.parse(automation.keywords || "[]"),
      actionType: automation.actionType,
      triggerType: automation.triggerType,
      message: automation.message,
      commentReply: automation.commentReply,
      aiPrompt: automation.aiPrompt,
      posts: JSON.parse(automation.posts || "[]"),
      active: automation.active,
      dmMode: automation.dmMode || "normal",
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString(),
    }

    return NextResponse.json({ 
      success: true, 
      automation: transformedAutomation 
    })
  } catch (error) {
    console.error("Error fetching automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const updateData: any = {}

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name
    if (body.keywords !== undefined) updateData.keywords = JSON.stringify(body.keywords)
    if (body.actionType !== undefined) updateData.actionType = body.actionType
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType
    if (body.message !== undefined) updateData.message = body.message
    if (body.commentReply !== undefined) updateData.commentReply = body.commentReply
    if (body.aiPrompt !== undefined) updateData.aiPrompt = body.aiPrompt
    if (body.posts !== undefined) updateData.posts = JSON.stringify(body.posts)
    if (body.active !== undefined) updateData.active = body.active
    if (body.dmMode !== undefined) updateData.dmMode = body.dmMode

    const automation = await prisma.automation.update({
      where: { 
        id: id,
        userId: session.user.id,
      },
      data: updateData,
    })

    return NextResponse.json({ 
      success: true, 
      automation: {
        id: automation.id,
        name: automation.name,
        keywords: JSON.parse(automation.keywords),
        actionType: automation.actionType,
        triggerType: automation.triggerType,
        active: automation.active,
        dmMode: automation.dmMode || "normal",
        createdAt: automation.createdAt.toISOString(),
        updatedAt: automation.updatedAt.toISOString(),
        type: automation.actionType === "ai" ? "Smart AI" : "Standard",
      }
    })
  } catch (error) {
    console.error("Error updating automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.automation.delete({
      where: { 
        id: id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
