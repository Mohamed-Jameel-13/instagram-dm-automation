import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = `debug_ig_api_${Date.now()}`
  
  try {
    console.log(`🔍 [${requestId}] Testing Instagram API endpoints...`)
    
    // Get your Instagram account
    const account = await prisma.account.findFirst({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        provider: "instagram"
      }
    })
    
    if (!account) {
      throw new Error("Instagram account not found")
    }
    
    const results = {
      account: {
        id: account.providerAccountId,
        scope: account.scope,
        hasToken: !!account.access_token
      },
      tests: {} as any
    }
    
    // Test 1: Basic Instagram API access
    console.log(`🔍 [${requestId}] Test 1: Basic Instagram API access...`)
    try {
      const response1 = await fetch(
        `https://graph.instagram.com/v18.0/${account.providerAccountId}?fields=id,username,account_type&access_token=${account.access_token}`
      )
      
      if (response1.ok) {
        const data = await response1.json()
        results.tests.basicAPI = { status: "✅ Working", data }
      } else {
        const errorText = await response1.text()
        results.tests.basicAPI = { status: "❌ Failed", error: errorText, statusCode: response1.status }
      }
    } catch (error) {
      results.tests.basicAPI = { status: "❌ Error", error: error instanceof Error ? error.message : "Unknown" }
    }
    
    // Test 2: Comment reply endpoint (correct format)
    console.log(`🔍 [${requestId}] Test 2: Comment reply endpoint...`)
    try {
      const testCommentId = "test_comment_123"
      const response2 = await fetch(
        `https://graph.instagram.com/v18.0/${testCommentId}/replies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
          },
          body: JSON.stringify({
            message: "Test reply"
          }),
        }
      )
      
      const errorText = await response2.text()
      results.tests.commentReply = { 
        status: response2.ok ? "✅ Working" : "❌ Failed",
        statusCode: response2.status,
        error: errorText
      }
    } catch (error) {
      results.tests.commentReply = { status: "❌ Error", error: error instanceof Error ? error.message : "Unknown" }
    }
    
    // Test 3: Private message endpoint (correct format)
    console.log(`🔍 [${requestId}] Test 3: Private message endpoint...`)
    try {
      const response3 = await fetch(
        `https://graph.instagram.com/v18.0/${account.providerAccountId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
          },
          body: JSON.stringify({
            recipient: { 
              comment_id: "test_comment_123" 
            },
            message: { 
              text: "Test private message" 
            }
          }),
        }
      )
      
      const errorText = await response3.text()
      results.tests.privateMessage = { 
        status: response3.ok ? "✅ Working" : "❌ Failed",
        statusCode: response3.status,
        error: errorText
      }
    } catch (error) {
      results.tests.privateMessage = { status: "❌ Error", error: error instanceof Error ? error.message : "Unknown" }
    }
    
    // Test 4: Alternative comment endpoint
    console.log(`🔍 [${requestId}] Test 4: Alternative comment endpoint...`)
    try {
      const response4 = await fetch(
        `https://graph.instagram.com/v18.0/${account.providerAccountId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
          },
          body: JSON.stringify({
            message: "Test comment"
          }),
        }
      )
      
      const errorText = await response4.text()
      results.tests.alternativeComment = { 
        status: response4.ok ? "✅ Working" : "❌ Failed",
        statusCode: response4.status,
        error: errorText
      }
    } catch (error) {
      results.tests.alternativeComment = { status: "❌ Error", error: error instanceof Error ? error.message : "Unknown" }
    }
    
    console.log(`✅ [${requestId}] Instagram API debug completed`)
    
    return NextResponse.json({
      success: true,
      requestId,
      results,
      recommendations: [
        "Check which endpoint returns valid responses",
        "Verify token permissions include comment management",
        "Test with real comment IDs from Instagram webhooks"
      ]
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Instagram API debug failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 