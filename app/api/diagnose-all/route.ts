import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const requestId = `diagnose_${Date.now()}`
  
  const results = {
    timestamp: new Date().toISOString(),
    issues: [] as string[],
    fixes: [] as string[],
    status: {} as any
  }
  
  try {
    console.log(`🔍 [${requestId}] Starting comprehensive diagnosis...`)
    
    // 1. Check Database Connection
    console.log(`🔍 [${requestId}] Testing database connection...`)
    try {
      await prisma.$queryRaw`SELECT 1`
      results.status.database = "✅ Connected"
    } catch (error) {
      results.status.database = "❌ Failed"
      results.issues.push("Database connection failed")
      results.fixes.push("Check DATABASE_URL environment variable")
    }
    
    // 2. Check Instagram Account
    console.log(`🔍 [${requestId}] Checking Instagram account...`)
    const instagramAccount = await prisma.account.findFirst({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        provider: "instagram"
      }
    })
    
    if (!instagramAccount) {
      results.status.instagram = "❌ Not found"
      results.issues.push("Instagram account not connected")
      results.fixes.push("Reconnect Instagram account in dashboard")
    } else {
      results.status.instagram = "✅ Connected"
      
      // Test Instagram API
      try {
        const apiResponse = await fetch(
          `https://graph.instagram.com/v18.0/${instagramAccount.providerAccountId}?fields=id,username,account_type&access_token=${instagramAccount.access_token}`
        )
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json()
          results.status.instagramAPI = `✅ Working (${apiData.account_type})`
          
          // Check if it's a business account
          if (apiData.account_type !== "BUSINESS") {
            results.issues.push("Instagram account is not a Business account")
            results.fixes.push("Convert Instagram account to Business in Instagram settings")
          }
        } else {
          results.status.instagramAPI = "❌ Failed"
          results.issues.push("Instagram API access failed - token may be expired")
          results.fixes.push("Regenerate Instagram access token")
        }
      } catch (error) {
        results.status.instagramAPI = "❌ Error"
        results.issues.push("Instagram API call failed")
      }
    }
    
    // 3. Check Active Automations
    console.log(`🔍 [${requestId}] Checking automations...`)
    const automations = await prisma.automation.findMany({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        active: true
      }
    })
    
    results.status.automations = `Found ${automations.length} active`
    
    const commentAutomations = automations.filter(a => a.triggerType === "comment")
    if (commentAutomations.length === 0) {
      results.issues.push("No active comment automations found")
      results.fixes.push("Create and activate comment automations")
    } else {
      results.status.commentAutomations = `✅ ${commentAutomations.length} active`
      
      // Check post restrictions
      const restrictedAutomations = commentAutomations.filter(a => {
        const posts = JSON.parse(a.posts || '[]')
        return posts.length > 0
      })
      
      if (restrictedAutomations.length > 0) {
        results.issues.push(`${restrictedAutomations.length} automations have post restrictions`)
        results.fixes.push("Remove post restrictions or comment on specific posts only")
      }
    }
    
    // 4. Check Environment Variables
    console.log(`🔍 [${requestId}] Checking environment variables...`)
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      INSTAGRAM_CLIENT_SECRET: !!process.env.INSTAGRAM_CLIENT_SECRET,
      INSTAGRAM_WEBHOOK_VERIFY_TOKEN: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
      REDIS_URL: !!process.env.REDIS_URL,
      REDIS_TOKEN: !!process.env.REDIS_TOKEN
    }
    
    results.status.environment = envVars
    
    if (!process.env.INSTAGRAM_CLIENT_SECRET) {
      results.issues.push("Missing INSTAGRAM_CLIENT_SECRET")
      results.fixes.push("Add INSTAGRAM_CLIENT_SECRET to Vercel environment variables")
    }
    
    if (!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      results.issues.push("Missing INSTAGRAM_WEBHOOK_VERIFY_TOKEN")
      results.fixes.push("Add INSTAGRAM_WEBHOOK_VERIFY_TOKEN to Vercel environment variables")
    }
    
    // 5. Check Webhook Configuration
    console.log(`🔍 [${requestId}] Testing webhook endpoint...`)
    try {
      const webhookTest = await fetch(`${req.nextUrl.origin}/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN}&hub.challenge=test123`)
      
      if (webhookTest.ok) {
        const challenge = await webhookTest.text()
        if (challenge === "test123") {
          results.status.webhook = "✅ Verification working"
        } else {
          results.status.webhook = "❌ Verification failed"
          results.issues.push("Webhook verification not working")
        }
      } else {
        results.status.webhook = "❌ Endpoint failed"
        results.issues.push("Webhook endpoint not accessible")
      }
    } catch (error) {
      results.status.webhook = "❌ Error"
      results.issues.push("Webhook test failed")
    }
    
    // 6. Check AutomationLog Schema
    console.log(`🔍 [${requestId}] Checking AutomationLog schema...`)
    try {
      // Try to create a test log entry
      await prisma.automationLog.create({
        data: {
          automationId: "test",
          triggerType: "test",
          triggerText: "test",
          userId: "test",
          username: "test",
          isNewFollower: false,
          triggeredAt: new Date()
        }
      })
      
      // Delete the test entry
      await prisma.automationLog.deleteMany({
        where: { automationId: "test" }
      })
      
      results.status.automationLog = "✅ Schema working"
    } catch (error) {
      results.status.automationLog = "❌ Schema error"
      results.issues.push("AutomationLog schema has issues")
      results.fixes.push("Fix AutomationLog database schema")
    }
    
    // Summary
    if (results.issues.length === 0) {
      results.status.overall = "✅ All systems operational"
    } else {
      results.status.overall = `❌ ${results.issues.length} issues found`
    }
    
    console.log(`✅ [${requestId}] Diagnosis completed: ${results.issues.length} issues found`)
    
    return NextResponse.json({
      success: true,
      requestId,
      results,
      nextSteps: results.issues.length > 0 ? results.fixes : ["Test by commenting 'hello' on your Instagram posts"]
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Diagnosis failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      results
    }, { status: 500 })
  }
} 