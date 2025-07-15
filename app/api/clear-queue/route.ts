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
  console.warn('Redis not configured for queue cleanup')
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `clear_${startTime}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    if (!redis) {
      return NextResponse.json({ 
        error: "Redis not configured",
        requestId 
      }, { status: 500 })
    }

    console.log(`🧹 [${requestId}] Starting queue cleanup...`)
    
    let clearedCount = 0
    let validEventCount = 0
    const maxClearTime = 30000 // 30 seconds max
    
    // Get all events and filter out invalid ones
    while ((Date.now() - startTime) < maxClearTime) {
      // Use rpop instead of brpop for Upstash Redis
      const eventData = await redis.rpop('instagram_events')
      
      if (!eventData) {
        console.log(`📭 [${requestId}] No more events in queue`)
        break
      }
      
      try {
        const event = JSON.parse(eventData)
        
        // Check if event is valid
        if (event.requestId && event.body && event.body.object === "instagram") {
          // This is a valid event, put it back at the end of the queue
          await redis.lpush('instagram_events', eventData)
          validEventCount++
          console.log(`✅ [${requestId}] Kept valid event: ${event.requestId}`)
        } else {
          // This is an invalid event, discard it
          clearedCount++
          console.log(`🗑️ [${requestId}] Discarded invalid event`)
        }
        
      } catch (error) {
        // JSON parsing failed, definitely invalid
        clearedCount++
        console.log(`🗑️ [${requestId}] Discarded unparseable event`)
      }
    }
    
    const totalTime = Date.now() - startTime
    const queueLength = await redis.llen('instagram_events')
    
    console.log(`✅ [${requestId}] Queue cleanup completed:`)
    console.log(`   - Cleared invalid: ${clearedCount}`)
    console.log(`   - Kept valid: ${validEventCount}`)
    console.log(`   - Remaining in queue: ${queueLength}`)
    console.log(`   - Total time: ${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      requestId,
      clearedCount,
      validEventCount,
      remainingInQueue: queueLength,
      totalTime
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Queue cleanup error:`, error)
    return NextResponse.json({
      error: "Queue cleanup failed",
      requestId,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 