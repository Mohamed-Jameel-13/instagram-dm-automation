import { type NextRequest, NextResponse } from "next/server"
import { Redis } from '@upstash/redis'

export async function GET(req: NextRequest) {
  const requestId = `simple_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Starting simple connectivity test...`)
    
    const tests = {
      environment: {},
      redis: { status: 'not_tested' },
      database: { status: 'not_tested' },
      timestamp: new Date().toISOString()
    }
    
    // Test 1: Environment Variables
    console.log(`🧪 [${requestId}] Testing environment variables...`)
    tests.environment = {
      redis_url: !!process.env.REDIS_URL,
      redis_token: !!process.env.REDIS_TOKEN,
      database_url: !!process.env.DATABASE_URL,
      instagram_client_id: !!process.env.INSTAGRAM_CLIENT_ID,
      azure_openai_key: !!process.env.AZURE_OPENAI_API_KEY
    }
    
    // Test 2: Redis Connection
    console.log(`🧪 [${requestId}] Testing Redis connection...`)
    try {
      if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
        const redis = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        })
        
        // Simple ping test
        const pingResult = await redis.ping()
        tests.redis = {
          status: 'connected',
          ping: pingResult,
          timestamp: new Date().toISOString()
        }
      } else {
        tests.redis = {
          status: 'missing_env_vars',
          error: 'REDIS_URL or REDIS_TOKEN not found'
        }
      }
    } catch (error) {
      tests.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      }
    }
    
    // Test 3: Database Connection (simple check)
    console.log(`🧪 [${requestId}] Testing database connection...`)
    try {
      if (process.env.DATABASE_URL) {
        // Just check if the URL is formatted correctly
        const dbUrl = new URL(process.env.DATABASE_URL)
        tests.database = {
          status: 'url_valid',
          host: dbUrl.hostname,
          protocol: dbUrl.protocol
        }
      } else {
        tests.database = {
          status: 'missing_env_vars',
          error: 'DATABASE_URL not found'
        }
      }
    } catch (error) {
      tests.database = {
        status: 'invalid_url',
        error: error instanceof Error ? error.message : 'Invalid DATABASE_URL'
      }
    }
    
    console.log(`✅ [${requestId}] Simple test completed`)
    
    return NextResponse.json({
      success: true,
      requestId,
      tests,
      message: "Simple connectivity test completed"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Simple test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Same as GET for convenience
  return GET(req)
} 