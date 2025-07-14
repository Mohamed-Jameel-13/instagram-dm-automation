import { type NextRequest, NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"

export async function POST(req: NextRequest) {
  const requestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`🧪 [${requestId}] Starting automation test...`)
    
    // Get test parameters from request
    const body = await req.json()
    const { 
      triggerType = "comment", 
      commentText = "hello test", 
      messageText = "hello test",
      commenterId = "test_user_123",
      senderId = "test_user_123",
      postId = "test_post_456"
    } = body
    
    // Create mock Instagram event data
    let mockEvent;
    
    if (triggerType === "comment") {
      mockEvent = {
        requestId,
        timestamp: Date.now(),
        body: {
          object: "instagram",
          entry: [{
            id: "test_business_account",
            time: Math.floor(Date.now() / 1000),
            changes: [{
              field: "comments",
              value: {
                id: `test_comment_${Date.now()}`,
                text: commentText,
                from: {
                  id: commenterId,
                  username: `testuser_${commenterId.slice(-4)}`
                },
                media: {
                  id: postId,
                  media_product_type: "FEED"
                },
                created_time: new Date().toISOString(),
                parent_id: null
              }
            }]
          }]
        },
        receivedAt: new Date().toISOString()
      };
    } else if (triggerType === "dm") {
      mockEvent = {
        requestId,
        timestamp: Date.now(),
        body: {
          object: "instagram",
          entry: [{
            id: "test_business_account",
            time: Math.floor(Date.now() / 1000),
            messaging: [{
              sender: {
                id: senderId
              },
              recipient: {
                id: "test_business_account"
              },
              timestamp: Math.floor(Date.now() / 1000),
              message: {
                mid: `test_mid_${Date.now()}`,
                text: messageText,
                is_echo: false
              }
            }]
          }]
        },
        receivedAt: new Date().toISOString()
      };
    } else {
      throw new Error(`Unsupported trigger type: ${triggerType}`)
    }
    
    console.log(`🧪 [${requestId}] Testing ${triggerType} automation with mock event...`)
    console.log(`🧪 [${requestId}] Mock event:`, JSON.stringify(mockEvent, null, 2))
    
    // Process the mock Instagram event
    const result = await processInstagramEvent(mockEvent)
    
    console.log(`✅ [${requestId}] Automation test completed successfully`)
    
    return NextResponse.json({
      success: true,
      requestId,
      triggerType,
      mockEvent,
      result,
      message: "Automation test completed - check logs for automation triggers"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Automation test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Automation Test Endpoint",
    usage: "POST with body: { triggerType: 'comment'|'dm', commentText?: string, messageText?: string }",
    examples: {
      comment: {
        triggerType: "comment",
        commentText: "hello info",
        commenterId: "test_user_123",
        postId: "test_post_456"
      },
      dm: {
        triggerType: "dm", 
        messageText: "hello support",
        senderId: "test_user_123"
      }
    }
  })
} 