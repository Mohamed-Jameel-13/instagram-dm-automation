import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    console.log("🔧 Fixing automation post restrictions...")
    
    // Remove post restrictions from your main automation
    const automation = await prisma.automation.update({
      where: { 
        id: "cmd4bcyq70003js04du24za4j" // Your "test" automation
      },
      data: {
        posts: "[]" // Allow comments on ALL posts
      }
    })
    
    console.log("✅ Post restrictions removed from automation:", automation.name)
    
    // Also remove restrictions from any other comment automations
    const allCommentAutomations = await prisma.automation.updateMany({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        triggerType: "comment",
        active: true
      },
      data: {
        posts: "[]" // Allow comments on ALL posts
      }
    })
    
    console.log(`✅ Updated ${allCommentAutomations.count} comment automations`)
    
    return NextResponse.json({
      success: true,
      message: "🎉 Automation fixed! Now comment 'hello' on ANY of your Instagram posts and it will respond!",
      automation: {
        id: automation.id,
        name: automation.name,
        keywords: JSON.parse(automation.keywords || '[]'),
        posts: automation.posts,
        message: automation.message,
        commentReply: automation.commentReply
      },
      totalUpdated: allCommentAutomations.count
    })
    
  } catch (error) {
    console.error("Fix automation error:", error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 