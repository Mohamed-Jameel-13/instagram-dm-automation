import { type NextRequest, NextResponse } from "next/server"
import { Redis } from '@upstash/redis'

const redis = process.env.REDIS_URL ? new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
}) : null

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Fetching recent webhook events...")
    
    let events = []
    
    if (redis) {
      // Get last 5 events from Redis
      const eventData = await redis.lrange('instagram_events', 0, 4)
      events = eventData.map(data => {
        try {
          return JSON.parse(data)
        } catch (e) {
          return { error: 'Invalid JSON', data }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      events,
      message: redis ? `Found ${events.length} recent webhook events` : "Redis not available - events processed inline",
      instructions: [
        "1. Go to your Instagram account @writesparkai",
        "2. Comment 'hello' on any post",
        "3. Refresh this endpoint to see the webhook event",
        "4. Check if automation responds to your comment"
      ]
    })
    
  } catch (error) {
    console.error("Webhook monitor error:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhook events" },
      { status: 500 }
    )
  }
} 