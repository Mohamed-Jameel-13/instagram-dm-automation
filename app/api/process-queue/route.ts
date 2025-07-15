import { type NextRequest, NextResponse } from "next/server"
import { Redis } from '@upstash/redis'
import { processInstagramEvent } from "@/lib/instagram-processor"

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
  console.warn('Redis not configured for queue processing')
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = `processor_${startTime}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    if (!redis) {
      return NextResponse.json({ 
        error: "Redis not configured",
        requestId 
      }, { status: 500 })
    }

    console.log(`🔄 [${requestId}] Starting queue processing...`)
    
    // Get batch size from request or default to 10
    const body = await req.json().catch(() => ({}))
    const batchSize = body.batchSize || 10
    const maxProcessingTime = body.maxProcessingTime || 25000 // 25 seconds max
    const clearInvalidEvents = body.clearInvalidEvents || false
    
    let processedCount = 0
    let failedCount = 0
    let clearedCount = 0
    const results = []
    
    // Process events until batch size or time limit reached
    while (processedCount < batchSize && (Date.now() - startTime) < maxProcessingTime) {
      // Get next event from queue (blocking pop with 1 second timeout)
      const eventData = await redis.brpop('instagram_events', 1)
      
      if (!eventData || !eventData[1]) {
        console.log(`📭 [${requestId}] No more events in queue`)
        break
      }
      
      try {
        const event = JSON.parse(eventData[1])
        
        // Validate event structure
        if (!event.requestId || !event.body) {
          throw new Error('Invalid event structure - missing requestId or body')
        }
        
        // Check if it's a valid Instagram event
        if (!event.body.object || event.body.object !== "instagram") {
          throw new Error('Invalid Instagram event - missing or wrong object type')
        }
        
        console.log(`⚡ [${requestId}] Processing event: ${event.requestId}`)
        
        // Process the Instagram event (this triggers automations)
        const result = await processInstagramEvent(event)
        
        results.push({
          eventId: event.requestId,
          success: true,
          result
        })
        
        processedCount++
        
      } catch (error) {
        console.error(`💥 [${requestId}] Failed to process event:`, error)
        
        // Check if it's a JSON parsing error or invalid event structure
        const isInvalidEvent = error instanceof SyntaxError || 
                               (error instanceof Error && (
                                 error.message.includes('Invalid event structure') ||
                                 error.message.includes('Invalid Instagram event') ||
                                 error.message.includes('missing requestId or body')
                               ))
        
        if (isInvalidEvent || clearInvalidEvents) {
          console.log(`🗑️ [${requestId}] Discarding invalid/legacy event`)
          clearedCount++
          // Don't queue invalid events, just discard them
        } else {
          // Move genuinely failed events to failed queue for later analysis
          try {
            await redis.lpush('failed_events', eventData[1])
          } catch (e) {
            console.error(`💥 [${requestId}] Failed to queue failed event:`, e)
          }
        }
        
        results.push({
          eventId: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          discarded: isInvalidEvent || clearInvalidEvents
        })
        
        failedCount++
      }
    }
    
    const totalTime = Date.now() - startTime
    
    console.log(`✅ [${requestId}] Queue processing completed:`)
    console.log(`   - Processed: ${processedCount}`)
    console.log(`   - Failed: ${failedCount}`)
    console.log(`   - Cleared: ${clearedCount}`)
    console.log(`   - Total time: ${totalTime}ms`)
    
    // Get current queue length
    const queueLength = await redis.llen('instagram_events')
    const failedQueueLength = await redis.llen('failed_events')
    
    return NextResponse.json({
      success: true,
      requestId,
      processedCount,
      failedCount,
      clearedCount,
      totalTime,
      queueLength,
      failedQueueLength,
      results: results.slice(0, 5) // Limit response size
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Queue processing error:`, error)
    return NextResponse.json({
      error: "Queue processing failed",
      requestId,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET route to check queue status
export async function GET(req: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json({ 
        error: "Redis not configured" 
      }, { status: 500 })
    }

    const queueLength = await redis.llen('instagram_events')
    const failedQueueLength = await redis.llen('failed_events')
    
    // Get a preview of the next few events without removing them
    const preview = await redis.lrange('instagram_events', 0, 2)
    const previewData = preview.map(event => {
      try {
        const parsed = JSON.parse(event)
        return {
          requestId: parsed.requestId,
          timestamp: parsed.timestamp,
          receivedAt: parsed.receivedAt,
          hasBody: !!parsed.body,
          bodyObject: parsed.body?.object
        }
      } catch (e) {
        return { error: 'Invalid event data' }
      }
    })
    
    return NextResponse.json({
      queueLength,
      failedQueueLength,
      preview: previewData,
      status: queueLength > 0 ? 'pending' : 'empty'
    })
    
  } catch (error) {
    console.error("Error checking queue status:", error)
    return NextResponse.json({
      error: "Failed to check queue status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE route to clear invalid events
export async function DELETE(req: NextRequest) {
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
      const eventData = await redis.brpop('instagram_events', 1)
      
      if (!eventData || !eventData[1]) {
        console.log(`📭 [${requestId}] No more events in queue`)
        break
      }
      
      try {
        const event = JSON.parse(eventData[1])
        
        // Check if event is valid
        if (event.requestId && event.body && event.body.object === "instagram") {
          // This is a valid event, put it back at the front of the queue
          await redis.rpush('instagram_events', eventData[1])
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