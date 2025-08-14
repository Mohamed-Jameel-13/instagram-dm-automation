import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    let userId = await getUserIdFromRequest(req)
    
    // TEMPORARY FIX: If no user ID from auth, use the known user ID from database
    if (!userId) {
      console.log("Debug Posts: No userId from auth, using default user")
      userId = "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2"
    }
    
    console.log(`Debug Posts: Using userId ${userId}`)

    // Get all post analytics with current data
    const posts = await prisma.postAnalytics.findMany({
      where: { userId },
      select: {
        postId: true,
        postThumbnail: true,
        postCaption: true,
        postType: true,
        totalComments: true,
        dmsSent: true,
        aiDmsSent: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        lastActivity: 'desc'
      },
      take: 20
    })

    const summary = {
      totalPosts: posts.length,
      postsWithThumbnails: posts.filter(p => p.postThumbnail).length,
      postsWithCaptions: posts.filter(p => p.postCaption && !p.postCaption.startsWith('Post ...')).length,
      postsWithTypes: posts.filter(p => p.postType).length,
      needingEnrichment: posts.filter(p => 
        !p.postThumbnail || 
        !p.postCaption || 
        p.postCaption.startsWith('Post ...') ||
        !p.postType
      ).length
    }

    return NextResponse.json({
      summary,
      posts: posts.map(post => ({
        ...post,
        needsEnrichment: !post.postThumbnail || 
                        !post.postCaption || 
                        post.postCaption.startsWith('Post ...') ||
                        !post.postType,
        shortPostId: post.postId.slice(-8)
      }))
    })

  } catch (error) {
    console.error("Error debugging posts:", error)
    return NextResponse.json(
      { error: "Failed to debug posts" },
      { status: 500 }
    )
  }
}
