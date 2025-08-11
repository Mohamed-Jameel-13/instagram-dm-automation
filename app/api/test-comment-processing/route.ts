import { NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"

export async function POST() {
  try {
    console.log("🧪 Testing Instagram comment processing directly...")
    
    // Simulate a comment webhook event
    const testEventData = {
      requestId: "test_comment_" + Date.now(),
      eventId: "test_event_123",
      timestamp: Date.now(),
      body: {
        object: "instagram",
        entry: [
          {
            id: "24695355950081100", // Your Instagram business account ID
            changes: [
              {
                field: "comments",
                value: {
                  id: "test_comment_" + Date.now(),
                  text: "no", // This should trigger the automation
                  from: {
                    id: "test_user_123",
                    username: "testuser"
                  },
                  media: {
                    id: "test_post_456"
                  },
                  parent_id: null // Top-level comment
                }
              }
            ]
          }
        ]
      },
      signature: "test_signature",
      receivedAt: new Date().toISOString()
    }
    
    console.log("🧪 Test event data:", JSON.stringify(testEventData, null, 2))
    
    // Call the processor directly
    const result = await processInstagramEvent(testEventData)
    
    console.log("🧪 Processing result:", result)
    
    return NextResponse.json({
      success: true,
      message: "Direct comment processing test completed",
      testEventData,
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("🧪 Direct processing test failed:", error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
