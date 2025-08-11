import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Testing Instagram message sending functionality")
    
    // Get the Instagram account
    const account = await prisma.account.findFirst({
      where: {
        provider: "instagram",
      },
    })
    
    if (!account?.access_token) {
      return NextResponse.json({
        success: false,
        error: "No Instagram access token found",
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    console.log(`Found Instagram account: ${account.providerAccountId}`)
    
    // Test 1: Try to send a direct message (if we had a user ID)
    // This would fail because we don't have a real user ID, but let's see the error
    
    const testUserId = "test_user_123"
    const testMessage = "This is a test message"
    
    console.log("🧪 Test 1: Attempting direct message...")
    
    try {
      const dmResponse = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          recipient: { 
            id: testUserId 
          },
          message: { 
            text: testMessage 
          }
        }),
      })
      
      const dmResult = await dmResponse.json()
      console.log("Direct message result:", dmResult)
      
      return NextResponse.json({
        success: true,
        message: "Direct message test completed",
        tests: {
          directMessage: {
            status: dmResponse.status,
            result: dmResult
          }
        },
        account: {
          id: account.providerAccountId,
          hasToken: !!account.access_token,
          scope: account.scope
        },
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error("Direct message test error:", error)
      
      // Test 2: Try private reply to comment (this would also fail without real comment ID)
      const testCommentId = "test_comment_123"
      
      console.log("🧪 Test 2: Attempting private reply...")
      
      try {
        const replyResponse = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
          },
          body: JSON.stringify({
            recipient: { 
              comment_id: testCommentId 
            },
            message: { 
              text: testMessage 
            }
          }),
        })
        
        const replyResult = await replyResponse.json()
        console.log("Private reply result:", replyResult)
        
        return NextResponse.json({
          success: true,
          message: "Message sending tests completed",
          tests: {
            directMessage: {
              error: error instanceof Error ? error.message : "Unknown error"
            },
            privateReply: {
              status: replyResponse.status,
              result: replyResult
            }
          },
          account: {
            id: account.providerAccountId,
            hasToken: !!account.access_token,
            scope: account.scope
          },
          timestamp: new Date().toISOString()
        })
        
      } catch (replyError) {
        console.error("Private reply test error:", replyError)
        
        return NextResponse.json({
          success: false,
          message: "Both message sending tests failed",
          tests: {
            directMessage: {
              error: error instanceof Error ? error.message : "Unknown error"
            },
            privateReply: {
              error: replyError instanceof Error ? replyError.message : "Unknown error"
            }
          },
          account: {
            id: account.providerAccountId,
            hasToken: !!account.access_token,
            scope: account.scope
          },
          timestamp: new Date().toISOString()
        }, { status: 500 })
      }
    }
    
  } catch (error) {
    console.error("Message sending test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
