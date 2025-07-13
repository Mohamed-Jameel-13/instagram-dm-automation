import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { followerTracker } from "@/lib/follower-tracker"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`Syncing followers for user: ${session.user.id}`)
    
    // Sync followers and detect new ones
    const result = await followerTracker.syncFollowers(session.user.id)
    
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get follower statistics
    const stats = await followerTracker.getFollowerStats(session.user.id)
    
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