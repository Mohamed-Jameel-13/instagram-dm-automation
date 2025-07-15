import { type NextRequest, NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"

export async function POST(req: NextRequest) {
  const requestId = `direct_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Testing automation directly (bypass queue)...`)
    
    // Create a mock Instagram comment webhook event
    const mockEvent = {
      requestId,
      timestamp: Date.now(),
      body: {
        object: "instagram",
        entry: [{
          id: "24695355950081100", // Your actual Instagram account ID
          time: Math.floor(Date.now() / 1000),
          changes: [{
            field: "comments",
            value: {
              id: `direct_test_comment_${Date.now()}`,
              text: "hello", // Should match your automation keyword
              from: {
                id: "test_user_12345",
                username: "testuser"
              },
              media: {
                id: "test_post_98765",
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
    
    console.log(`🧪 [${requestId}] Processing mock event:`, JSON.stringify(mockEvent, null, 2))
    
    // Process the event directly (no queue)
    const result = await processInstagramEvent(mockEvent)
    
    console.log(`🧪 [${requestId}] Direct processing result:`, result)
    
    return NextResponse.json({
      success: true,
      requestId,
      mockEvent,
      processingResult: result,
      message: "Direct automation test completed - check logs for automation execution"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Direct automation test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 