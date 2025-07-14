import { type NextRequest, NextResponse } from "next/server"
import { getInstagramAPI } from "@/lib/instagram-api"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "12")

    // Get Instagram API instance for the user
    const instagramAPI = await getInstagramAPI(userId)
    
    if (!instagramAPI) {
      return NextResponse.json({ 
        error: "Instagram not connected", 
        posts: [] 
      }, { status: 400 })
    }

    // Get recent media posts using Basic Display API (no need for separate user ID call)
    const posts = await instagramAPI.getRecentMedia("me", limit)

    // Transform posts to include the data we need
    const transformedPosts = posts.map(post => ({
      id: post.id,
      caption: post.caption || "",
      media_type: post.media_type,
      media_url: post.media_url,
      timestamp: post.timestamp,
      // Generate a thumbnail URL for video content
      thumbnail_url: post.media_type === 'VIDEO' && post.thumbnail_url ? post.thumbnail_url : post.media_url
    }))

    return NextResponse.json({ 
      posts: transformedPosts,
      success: true 
    })

  } catch (error) {
    console.error("Error fetching Instagram posts:", error)
    return NextResponse.json({ 
      error: "Failed to fetch posts", 
      posts: [] 
    }, { status: 500 })
  }
}
