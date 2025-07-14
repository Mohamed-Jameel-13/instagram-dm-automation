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
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 })
    }

    // Get Instagram API instance for the user
    const instagramAPI = await getInstagramAPI(userId)
    
    if (!instagramAPI) {
      return NextResponse.json({ 
        error: "Instagram not connected", 
        postId: postId
      }, { status: 400 })
    }

    try {
      // Try to get post details using Basic Display API
      const response = await fetch(`https://graph.instagram.com/${postId}?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${instagramAPI.token}`)
      
      if (response.ok) {
        const postData = await response.json()
        return NextResponse.json({ 
          success: true,
          postId: postId,
          postData: postData
        })
      } else {
        const errorData = await response.text()
        return NextResponse.json({ 
          success: false,
          postId: postId,
          error: "Post not found or not accessible",
          details: errorData
        })
      }
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        postId: postId,
        error: "Failed to fetch post details",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }

  } catch (error) {
    console.error("Error in post lookup:", error)
    return NextResponse.json({ 
      error: "Failed to lookup post",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
