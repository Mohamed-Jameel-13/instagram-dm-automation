import { NextResponse, NextRequest } from "next/server"
import crypto from "crypto"

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

// Import optimized processor
import { processInstagramEventOptimized } from '@/lib/instagram-processor'
import { prisma } from '@/lib/db'

// Use same webhook validation as original
async function validateInstagramSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET

  if (!signature || !appSecret) {
    return false
  }
  
  const signatureHash = signature.split("=")[1]
  
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex")

  return crypto.timingSafeEqual(Buffer.from(signatureHash, 'hex'), Buffer.from(expectedHash, 'hex'))
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `opt_${startTime}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    const body = await req.text()
    const signature = req.headers.get("X-Hub-Signature-256")
    
    console.log(`🚀 [${requestId}] OPTIMIZED webhook processing...`)
    
    // Validate signature
    if (!(await validateInstagramSignature(body, signature))) {
      console.error(`❌ [${requestId}] Invalid signature`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    
    const parsedBody = JSON.parse(body)
    let eventId = `${requestId}_${Buffer.from(body).toString('base64').slice(0, 20)}`

    // Create specific event ID for comments
    const maybeChangeValue = parsedBody.entry?.[0]?.changes?.[0]?.value
    if (maybeChangeValue && (maybeChangeValue.id || maybeChangeValue.comment_id)) {
      const commentId = maybeChangeValue.id || maybeChangeValue.comment_id
      const fromId = maybeChangeValue.from?.id || 'unknown'
      eventId = `comment_${commentId}_${fromId}`
    }
    
    // Check for duplicates
    const existingWebhook = await prisma.processedWebhook.findUnique({
      where: { eventId }
    })
    
    if (existingWebhook) {
      console.log(`🔄 [${requestId}] Duplicate webhook, returning cached result`)
      return NextResponse.json({ 
        success: true, 
        requestId,
        eventId,
        cached: true,
        result: existingWebhook.result ? JSON.parse(existingWebhook.result) : null
      })
    }
    
    // Process with optimized handler
    const eventData = {
      requestId,
      body: parsedBody,
      signature,
      receivedAt: new Date().toISOString()
    }
    
    const result = await processInstagramEventOptimized(eventData)
    
    // Mark as processed
    await prisma.processedWebhook.create({
      data: {
        eventId,
        requestId,
        webhookBody: typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody),
        result: typeof result === 'string' ? result : JSON.stringify(result)
      }
    })
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [${requestId}] OPTIMIZED processing completed in ${totalTime}ms`)
    
    return NextResponse.json({ 
      success: true, 
      requestId,
      eventId,
      processedAt: new Date().toISOString(),
      optimized: true,
      processingTime: totalTime,
      result
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] OPTIMIZED webhook error:`, error)
    return NextResponse.json({ 
      error: "Internal server error",
      requestId,
      optimized: true
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ OPTIMIZED Instagram webhook verified successfully')
    return new NextResponse(challenge)
  }

  return new NextResponse('Forbidden', { status: 403 })
}