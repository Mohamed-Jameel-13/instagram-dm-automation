import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 BASIC TEST: Testing fundamental components")
    
    // Test 1: Environment variables
    const hasDatabase = !!process.env.DATABASE_URL
    const hasInstagramAppId = !!process.env.INSTAGRAM_APP_ID
    const hasInstagramAppSecret = !!process.env.INSTAGRAM_APP_SECRET
    
    console.log("✅ Test 1: Environment check")
    console.log(`- Database URL: ${hasDatabase ? 'Present' : 'Missing'}`)
    console.log(`- Instagram App ID: ${hasInstagramAppId ? 'Present' : 'Missing'}`)
    console.log(`- Instagram App Secret: ${hasInstagramAppSecret ? 'Present' : 'Missing'}`)
    
    // Test 2: Database connection
    let dbConnected = false
    let automationCount = 0
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      automationCount = await prisma.automation.count()
      await prisma.$disconnect()
      dbConnected = true
      
      console.log("✅ Test 2: Database connection successful")
      console.log(`- Total automations: ${automationCount}`)
    } catch (dbError) {
      console.error("❌ Test 2: Database connection failed:", dbError)
    }
    
    // Test 3: Import check
    let importWorking = false
    try {
      const { handleInstagramComment } = await import('@/lib/instagram-processor');
      importWorking = typeof handleInstagramComment === 'function'
      console.log("✅ Test 3: Import check successful")
    } catch (importError) {
      console.error("❌ Test 3: Import check failed:", importError)
    }
    
    return NextResponse.json({
      success: true,
      message: "Basic test completed",
      results: {
        environment: {
          hasDatabase,
          hasInstagramAppId,
          hasInstagramAppSecret
        },
        database: {
          connected: dbConnected,
          automationCount
        },
        imports: {
          working: importWorking
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("💥 Basic test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
