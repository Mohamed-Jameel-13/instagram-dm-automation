import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    
    // Get headers that might contain auth info
    const authHeader = req.headers.get('authorization')
    const cookies = req.headers.get('cookie')
    
    return NextResponse.json({
      userId: userId || null,
      authenticated: !!userId,
      authHeader: authHeader ? 'Present' : 'Missing',
      cookies: cookies ? 'Present' : 'Missing',
      expectedUserId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
      matches: userId === "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
      debug: {
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: "Auth debug failed", 
        details: error instanceof Error ? error.message : String(error),
        userId: null,
        authenticated: false
      },
      { status: 500 }
    )
  }
}
