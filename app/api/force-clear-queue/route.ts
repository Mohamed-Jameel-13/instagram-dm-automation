import { type NextRequest, NextResponse } from "next/server"
import { Redis } from '@upstash/redis'

export async function POST(req: NextRequest) {
  const requestId = `force_clear_${Date.now()}`
  
  try {
    console.log(`🧹 [${requestId}] Force clearing Redis queue...`)
    
    if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "Redis not configured",
        requestId
      }, { status: 500 })
    }
    
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
    
    // Get current queue lengths
    const beforeMain = await redis.llen('instagram_events')
    const beforeFailed = await redis.llen('failed_events')
    
    console.log(`🧹 [${requestId}] Before clearing: main=${beforeMain}, failed=${beforeFailed}`)
    
    // Delete both queues completely
    await redis.del('instagram_events')
    await redis.del('failed_events')
    
    // Verify they're cleared
    const afterMain = await redis.llen('instagram_events')
    const afterFailed = await redis.llen('failed_events')
    
    console.log(`🧹 [${requestId}] After clearing: main=${afterMain}, failed=${afterFailed}`)
    
    return NextResponse.json({
      success: true,
      requestId,
      cleared: {
        mainQueue: beforeMain,
        failedQueue: beforeFailed
      },
      verified: {
        mainQueue: afterMain,
        failedQueue: afterFailed
      },
      message: "Queue force cleared successfully"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Force clear failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 