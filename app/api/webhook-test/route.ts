import { type NextRequest, NextResponse } from "next/server"
import { Redis } from '@upstash/redis'

// Initialize Redis connection
let redis: Redis | null = null
try {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  }
} catch (error) {
  console.warn('Redis not configured for webhook test')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify webhook subscription (same as main webhook)
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook test verification successful')
    return new Response(challenge)
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `webhook_test_${startTime}`
  
  try {
    console.log(`🧪 [${requestId}] Webhook test - bypassing signature validation`)
    
    // Get body without signature validation
    const body = await req.text()
    const signature = req.headers.get('X-Hub-Signature-256')
    
    console.log(`📨 [${requestId}] Received webhook:`)
    console.log(`📨 [${requestId}] Signature: ${signature}`)
    console.log(`📨 [${requestId}] Body length: ${body.length}`)
    console.log(`📨 [${requestId}] Body preview: ${body.substring(0, 200)}...`)
    
    // Check environment variables
    const hasClientSecret = !!process.env.INSTAGRAM_CLIENT_SECRET
    const hasVerifyToken = !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
    
    console.log(`🔐 [${requestId}] INSTAGRAM_CLIENT_SECRET: ${hasClientSecret ? 'SET' : 'MISSING'}`)
    console.log(`🔐 [${requestId}] INSTAGRAM_WEBHOOK_VERIFY_TOKEN: ${hasVerifyToken ? 'SET' : 'MISSING'}`)
    
    // Try to parse body
    let parsedBody;
    try {
      parsedBody = JSON.parse(body)
      console.log(`✅ [${requestId}] Body parsed successfully`)
      console.log(`📝 [${requestId}] Event object: ${parsedBody.object}`)
      
      if (parsedBody.entry && parsedBody.entry.length > 0) {
        console.log(`📝 [${requestId}] Entries: ${parsedBody.entry.length}`)
        for (let i = 0; i < parsedBody.entry.length; i++) {
          const entry = parsedBody.entry[i]
          console.log(`📝 [${requestId}] Entry ${i}: ID=${entry.id}`)
          
          if (entry.changes) {
            console.log(`📝 [${requestId}] Entry ${i} has ${entry.changes.length} changes`)
            entry.changes.forEach((change, j) => {
              console.log(`📝 [${requestId}] Change ${j}: field=${change.field}`)
            })
          }
          
          if (entry.messaging) {
            console.log(`📝 [${requestId}] Entry ${i} has ${entry.messaging.length} messages`)
          }
        }
      }
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse body:`, parseError)
    }
    
    // Queue the event for inspection (if Redis available)
    if (redis) {
      const eventData = {
        requestId,
        timestamp: startTime,
        body: parsedBody || body,
        signature,
        receivedAt: new Date().toISOString(),
        testEvent: true
      }
      
      await redis.lpush('webhook_test_events', JSON.stringify(eventData))
      console.log(`📨 [${requestId}] Event queued for inspection`)
    }
    
    console.log(`✅ [${requestId}] Webhook test completed in ${Date.now() - startTime}ms`)
    
    return NextResponse.json({ 
      success: true, 
      requestId,
      message: "Webhook test completed - check logs",
      environmentCheck: {
        hasClientSecret,
        hasVerifyToken
      }
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Webhook test error:`, error)
    return NextResponse.json({ 
      error: "Webhook test failed",
      requestId 
    }, { status: 500 })
  }
} 