import { type NextRequest, NextResponse } from "next/server"
import { processInstagramEvent } from "@/lib/instagram-processor"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `debug_${Date.now()}`
  
  try {
    console.log(`🔍 [${requestId}] Starting debug processing test...`)
    
    // First, let's check what automations exist
    const automations = await prisma.automation.findMany({
      where: { active: true },
      include: { user: true }
    })
    
    console.log(`🔍 [${requestId}] Found ${automations.length} active automations`)
    
    // Check what Instagram accounts are connected
    const instagramAccounts = await prisma.account.findMany({
      where: { provider: "instagram" },
      select: {
        userId: true,
        providerAccountId: true,
        scope: true,
        access_token: true
      }
    })
    
    console.log(`🔍 [${requestId}] Found ${instagramAccounts.length} Instagram accounts`)
    
    // Create a test comment event with your actual Instagram account ID
    const mockEvent = {
      requestId,
      timestamp: Date.now(),
      body: {
        object: "instagram",
        entry: [{
          id: "24695355950081100", // Your actual Instagram account ID
          time: Math.floor(Date.now() / 1000),
          changes: [{
            field: "comments",
            value: {
              id: `debug_comment_${Date.now()}`,
              text: "hello", // This should match your automation
              from: {
                id: "debug_user_123456",
                username: "debuguser"
              },
              media: {
                id: "debug_post_789",
                media_product_type: "FEED"
              },
              created_time: new Date().toISOString(),
              parent_id: null
            }
          }]
        }]
      },
      receivedAt: new Date().toISOString()
    }
    
    console.log(`🔍 [${requestId}] Processing mock event...`)
    
    // Process the event and capture the result
    const result = await processInstagramEvent(mockEvent)
    
    console.log(`🔍 [${requestId}] Processing completed`)
    
    return NextResponse.json({
      success: true,
      requestId,
      debug: {
        automationsFound: automations.length,
        instagramAccountsConnected: instagramAccounts.length,
        automationDetails: automations.map(a => ({
          id: a.id,
          name: a.name,
          triggerType: a.triggerType,
          keywords: JSON.parse(a.keywords || '[]'),
          userId: a.userId,
          active: a.active
        })),
        instagramAccountDetails: instagramAccounts.map(acc => ({
          userId: acc.userId,
          providerAccountId: acc.providerAccountId,
          scope: acc.scope,
          hasToken: !!acc.access_token
        })),
        testEvent: mockEvent,
        processingResult: result
      },
      message: "Debug processing completed - check logs for detailed execution flow"
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Debug processing failed:`, error)
    return NextResponse.json({ 
      error: 'Debug processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId
    }, { status: 500 })
  }
}