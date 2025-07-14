import { NextRequest, NextResponse } from "next/server"
import { followerTracker } from "@/lib/follower-tracker"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function POST(req: NextRequest) {
  try {
    // Get user ID from request body first (from Firebase Auth on client)
    const body = await req.json().catch(() => ({}))
    let userId = body.userId
    
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`Syncing followers for user: ${userId}`)
    
    // Sync followers and detect new ones
    const result = await followerTracker.syncFollowers(userId)
    
    console.log(`Sync completed - Total: ${result.totalFollowers}, New: ${result.newFollowers.length}`)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        totalFollowers: result.totalFollowers,
        newFollowersCount: result.newFollowers.length,
        newFollowers: result.newFollowers.map(f => ({
          id: f.id,
          username: f.username
        }))
      }
    })
  } catch (error) {
    console.error("Error syncing followers:", error)
    return NextResponse.json({ 
      error: "Failed to sync followers", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query parameters first (from Firebase Auth on client)
    const url = new URL(req.url)
    let userId = url.searchParams.get('userId')
    
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get follower statistics
    const stats = await followerTracker.getFollowerStats(userId)
    
    return NextResponse.json({ 
      success: true, 
      data: stats
    })
  } catch (error) {
    console.error("Error getting follower stats:", error)
    return NextResponse.json({ 
      error: "Failed to get follower statistics", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 