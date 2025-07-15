import { type NextRequest, NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"

export async function POST(req: NextRequest) {
  const requestId = `direct_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Starting direct automation test...`)
    
    // Create a mock Instagram comment event
    const mockEvent = {
      requestId,
      timestamp: Date.now(),
      body: {
        object: "instagram",
        entry: [{
          id: "24695355950081100", // Your Instagram account ID
          time: Math.floor(Date.now() / 1000),
          changes: [{
            field: "comments",
            value: {
              id: `test_comment_${Date.now()}`,
              text: "hello", // Test keyword
              from: {
                id: "test_user_123456",
                username: "testuser"
              },
              media: {
                id: "test_post_789",
                media_product_type: "FEED"
              },
              created_time: new Date().toISOString(),
              parent_id: null
            }
          }]
        }]
      },
      receivedAt: new Date().toISOString()
    }
    
    console.log(`🧪 [${requestId}] Mock event created:`, JSON.stringify(mockEvent, null, 2))
    
    // Process the mock event directly
    const result = await processInstagramEvent(mockEvent)
    
    console.log(`✅ [${requestId}] Direct automation test completed`)
    
    return NextResponse.json({
      success: true,
      requestId,
      mockEvent,
      result,
      message: "Direct automation test completed - check logs for automation processing"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Direct automation test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Direct Automation Test Endpoint",
    usage: "POST to test automation logic directly",
    description: "This bypasses Instagram webhooks and tests your automation processing directly"
  })
} 