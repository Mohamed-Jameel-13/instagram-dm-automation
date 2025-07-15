import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log(`🧪 Testing webhook with proper Instagram payload...`)
    
    // Create a proper Instagram webhook payload
    const webhookPayload = {
      object: "instagram",
      entry: [{
        id: "24695355950081100", // Your Instagram account ID
        time: Math.floor(Date.now() / 1000),
        changes: [{
          field: "comments",
          value: {
            id: `test_comment_${Date.now()}`,
            text: "hello", // Test keyword that should match your automation
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
    }
    
    console.log(`🧪 Webhook payload:`, JSON.stringify(webhookPayload, null, 2))
    
    // Send the payload to our webhook endpoint with a signature bypass
    const webhookUrl = `${req.nextUrl.origin}/api/webhooks/instagram`
    
    // Create a fake signature (since we're testing)
    const testSignature = "sha256=test_signature_for_testing"
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': testSignature
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const result = await response.json()
    
    console.log(`🧪 Webhook response:`, result)
    
    return NextResponse.json({
      success: true,
      webhookPayload,
      webhookResponse: result,
      message: "Test webhook sent - check if it processed inline (since Redis may not be available)"
    })
    
  } catch (error) {
    console.error('❌ Test webhook failed:', error)
    return NextResponse.json({ 
      error: 'Test webhook failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 