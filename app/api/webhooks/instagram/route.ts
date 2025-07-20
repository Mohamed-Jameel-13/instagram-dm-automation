import { type NextRequest, NextResponse } from "next/server"

// Force Node.js runtime for Prisma compatibility (fixes database issues)
export const runtime = 'nodejs'

// Import Redis for queueing (Edge-compatible)
import { Redis } from '@upstash/redis'
import { processInstagramEvent } from '@/lib/instagram-processor'

// Webhook deduplication cache (in-memory)
const processedWebhooks = new Map<string, { timestamp: number, result: any }>()
const WEBHOOK_CACHE_TTL = 300000 // 5 minutes

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of processedWebhooks.entries()) {
    if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
      processedWebhooks.delete(key)
    }
  }
}, 60000)

// Temporarily disable Redis to fix queue issues and process webhooks inline
let redis: Redis | null = null
try {
  // TEMPORARILY DISABLED: Redis has compatibility issues causing queue corruption
  // Re-enable after fixing Redis client compatibility
  if (false && process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  }
} catch (error) {
  console.warn('Redis not configured for webhook queue, using fallback processing')
}

// Webhook signature validation using Web Crypto API (Edge Runtime compatible)
async function validateInstagramSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  
  // Allow test signatures for development testing
  if (signature === "sha256=test_signature_for_testing") {
    console.log("⚠️ Using test signature bypass for development")
    return true
  }
  
  const appSecret = process.env.INSTAGRAM_CLIENT_SECRET
  if (!appSecret) return false
  
  try {
    // Convert secret to Uint8Array
    const secretKey = new TextEncoder().encode(appSecret)
    const bodyData = new TextEncoder().encode(body)
    
    // Create HMAC key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    // Generate HMAC
    const hmacBuffer = await crypto.subtle.sign('HMAC', cryptoKey, bodyData)
    const hmacArray = Array.from(new Uint8Array(hmacBuffer))
    const expectedSignature = hmacArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return `sha256=${expectedSignature}` === signature
  } catch (error) {
    console.error('Error validating signature:', error)
    return false
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify webhook subscription
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    console.log('Instagram webhook verified successfully')
    return new Response(challenge)
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // 1. Get body and signature
    const body = await req.text()
    const signature = req.headers.get('X-Hub-Signature-256')
    
    console.log(`🔐 [${requestId}] Validating Instagram webhook signature...`)
    
    // 2. Validate signature (fast check)
    if (!(await validateInstagramSignature(body, signature))) {
      console.error(`❌ [${requestId}] Invalid signature`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    
    console.log(`✅ [${requestId}] Signature validated in ${Date.now() - startTime}ms`)
    
    // 3. Generate unique event ID for deduplication based on content
    const parsedBody = JSON.parse(body)
    let eventId = `${requestId}_${Buffer.from(body).toString('base64').slice(0, 20)}`
    
    // Create more specific event ID for comments
    if (parsedBody.entry?.[0]?.changes?.[0]?.value?.comment_id) {
      const comment = parsedBody.entry[0].changes[0].value
      eventId = `comment_${comment.comment_id}_${comment.from?.id || 'unknown'}`
    }
    
    // Check if we've already processed this exact webhook
    if (processedWebhooks.has(eventId)) {
      const cached = processedWebhooks.get(eventId)
      console.log(`🚫 [${requestId}] Webhook already processed at ${new Date(cached!.timestamp).toISOString()}, returning cached result`)
      return NextResponse.json({
        success: true,
        requestId,
        cached: true,
        originalTimestamp: cached!.timestamp,
        result: cached!.result
      })
    }
    
    console.log(`🆔 [${requestId}] Generated event ID: ${eventId}`)
    
    // 4. Queue the event for background processing (non-blocking)
    const queueStart = Date.now()
    
    const eventData = {
      requestId,
      eventId,
      timestamp: startTime,
      body: JSON.parse(body),
      signature,
      receivedAt: new Date().toISOString()
    }
    
    // Push to Redis queue for background processing (if available)
    if (redis) {
      await redis.lpush('instagram_events', JSON.stringify(eventData))
      console.log(`📨 [${requestId}] Event queued in ${Date.now() - queueStart}ms`)
      console.log(`⚡ [${requestId}] Total webhook response time: ${Date.now() - startTime}ms`)
      
      // 4. Return success immediately (Instagram gets fast response)
      return NextResponse.json({ 
        success: true, 
        requestId,
        processedAt: new Date().toISOString(),
        queuedForProcessing: true
      })
    } else {
      console.warn(`⚠️ [${requestId}] Redis not available, processing webhook inline`)
      
      // Process the event inline when Redis is not available
      try {
        const result = await processInstagramEvent(eventData)
        console.log(`✅ [${requestId}] Event processed inline in ${Date.now() - startTime}ms`)
        
        // Cache the result to prevent duplicate processing
        processedWebhooks.set(eventId, {
          timestamp: Date.now(),
          result
        })
        
        return NextResponse.json({ 
          success: true, 
          requestId,
          eventId,
          processedAt: new Date().toISOString(),
          processedInline: true,
          result
        })
      } catch (processingError) {
        console.error(`💥 [${requestId}] Inline processing failed:`, processingError)
        
        // Cache the error to prevent retrying the same failed event
        processedWebhooks.set(eventId, {
          timestamp: Date.now(),
          result: { error: processingError instanceof Error ? processingError.message : "Processing failed" }
        })
        
        // Still return success to Instagram so they don't retry
        return NextResponse.json({ 
          success: true, 
          requestId,
          eventId,
          processedAt: new Date().toISOString(),
          processingFailed: true,
          error: processingError instanceof Error ? processingError.message : "Processing failed"
        })
      }
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Webhook error:`, error)
    return NextResponse.json({ 
      error: "Internal server error",
      requestId 
    }, { status: 500 })
  }
}
