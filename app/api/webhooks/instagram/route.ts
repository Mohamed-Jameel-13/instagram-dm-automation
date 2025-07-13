import { type NextRequest, NextResponse } from "next/server"

// Use Edge Runtime for ultra-fast response
export const runtime = 'edge'

// Import Redis for queueing (Edge-compatible)
import { Redis } from '@upstash/redis'

// Initialize Redis connection
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

// Webhook signature validation using Web Crypto API (Edge Runtime compatible)
async function validateInstagramSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  
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
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
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
    
    // 3. Queue the event for background processing (non-blocking)
    const queueStart = Date.now()
    
    const eventData = {
      requestId,
      timestamp: startTime,
      body: JSON.parse(body),
      signature,
      receivedAt: new Date().toISOString()
    }
    
    // Push to Redis queue for background processing
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
    
  } catch (error) {
    console.error(`💥 [${requestId}] Webhook error:`, error)
    return NextResponse.json({ 
      error: "Internal server error",
      requestId 
    }, { status: 500 })
  }
}
