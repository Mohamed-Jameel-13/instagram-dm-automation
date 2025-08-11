import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection and check critical data
    const dbCheck: any = {
      // Connection test
      connectionStatus: "testing...",
      
      // Count all tables
      userCount: 0,
      automationCount: 0,
      followerCount: 0,
      automationLogCount: 0,
      trackedUserCount: 0,
      conversationSessionCount: 0,
      processedWebhookCount: 0,
      
      // Check for test user data
      testUsers: [],
      testAutomations: [],
      
      // Recent activity
      recentLogs: [],
      recentWebhooks: [],
      
      // Database health
      issues: [],
      timestamp: new Date().toISOString()
    }

    // Test basic connection
    await prisma.$connect()
    dbCheck.connectionStatus = "connected"

    // Count records in each table
    dbCheck.userCount = await prisma.user.count()
    dbCheck.automationCount = await prisma.automation.count()
    dbCheck.followerCount = await prisma.follower.count()
    dbCheck.automationLogCount = await prisma.automationLog.count()
    dbCheck.trackedUserCount = await prisma.trackedUser.count()
    dbCheck.conversationSessionCount = await prisma.conversationSession.count()
    
    // Try to count processed webhooks (may not exist in current client)
    try {
      dbCheck.processedWebhookCount = await (prisma as any).processedWebhook.count()
    } catch (e) {
      dbCheck.processedWebhookCount = "Model not found"
    }

    // Get test users (first 3)
    dbCheck.testUsers = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    // Get test automations (first 3)
    dbCheck.testAutomations = await prisma.automation.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        active: true,
        triggerType: true,
        keywords: true,
        userId: true
      }
    })

    // Get recent automation logs (last 5)
    dbCheck.recentLogs = await prisma.automationLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        triggerType: true,
        triggerText: true,
        username: true,
        triggeredAt: true
      }
    })

    // Try to get recent webhook processing (last 5)
    try {
      dbCheck.recentWebhooks = await (prisma as any).processedWebhook.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          eventId: true,
          requestId: true,
          processedAt: true,
          result: true
        }
      })
    } catch (e) {
      dbCheck.recentWebhooks = "ProcessedWebhook model not found"
    }

    // Health checks
    if (dbCheck.userCount === 0) {
      dbCheck.issues.push("No users found - database may not be seeded")
    }
    
    if (dbCheck.automationCount === 0) {
      dbCheck.issues.push("No automations found - user needs to create automations")
    }

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      database: dbCheck
    })

  } catch (error) {
    console.error('Database debug error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Emergency database reset/reseed
    console.log("🔄 Starting emergency database reseed...")
    
    // Check if we have any users first
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      // Create a test user if none exist
      const testUser = await prisma.user.create({
        data: {
          email: "test@writesparkai.com",
          name: "Test User",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log("✅ Created test user:", testUser.id)
      
      // Create a test automation
      const testAutomation = await prisma.automation.create({
        data: {
          name: "Test Comment Automation",
          active: true,
          triggerType: "comment",
          keywords: "hello,test,info",
          actionType: "dm",
          message: "Thanks for your comment! I'll send you more info via DM.",
          posts: "all",
          dmMode: "normal",
          userId: testUser.id
        }
      })
      
      console.log("✅ Created test automation:", testAutomation.id)
      
      return NextResponse.json({
        success: true,
        message: "Database reseeded successfully",
        created: {
          user: testUser,
          automation: testAutomation
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        message: "Database already has users, no reseed needed",
        userCount
      })
    }
    
  } catch (error) {
    console.error('Database reseed error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown reseed error'
    }, { status: 500 })
  }
}