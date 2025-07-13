import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { commentText, postId, commenterId } = await req.json()

    console.log("=== MANUAL COMMENT TEST ===")
    console.log("Comment text:", commentText)
    console.log("Post ID:", postId) 
    console.log("Commenter ID:", commenterId)

    // Simulate the comment data structure that Instagram sends
    const mockCommentData = {
      id: "test_comment_" + Date.now(),
      text: commentText,
      from: {
        id: commenterId || "test_commenter_123"
      },
      media: {
        id: postId
      }
    }

    // Import the handleInstagramComment function
    const { handleInstagramComment } = await import("../../webhooks/instagram/route")
    
    // Test the comment handling logic
    await handleInstagramComment(mockCommentData)

    return NextResponse.json({ 
      success: true, 
      message: "Comment test completed - check console logs",
      mockData: mockCommentData
    })

  } catch (error) {
    console.error("Error in comment test:", error)
    return NextResponse.json({ 
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
