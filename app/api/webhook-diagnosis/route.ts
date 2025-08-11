import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const requestId = `diagnosis_${Date.now()}`
  
  try {
    console.log(`🔍 [${requestId}] Starting comprehensive webhook diagnosis...`)
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      requestId,
      issues: [] as string[],
      fixes: [] as string[],
      status: {} as Record<string, string>
    }

    // 1. Check Environment Variables
    console.log(`🔧 [${requestId}] Checking environment configuration...`)
    const requiredEnvVars = [
      'INSTAGRAM_CLIENT_SECRET',
      'INSTAGRAM_WEBHOOK_VERIFY_TOKEN',
      'DATABASE_URL'
    ]
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        diagnosis.issues.push(`❌ Missing environment variable: ${envVar}`)
        diagnosis.fixes.push(`Set ${envVar} in your .env.local file`)
      } else {
        diagnosis.status[envVar] = '✅ Configured'
      }
    }

    // 2. Check Instagram Account Configuration
    console.log(`📱 [${requestId}] Checking Instagram account setup...`)
    const instagramAccount = await prisma.account.findFirst({
      where: { provider: 'instagram' }
    })
    
    if (!instagramAccount) {
      diagnosis.issues.push('❌ No Instagram account connected')
      diagnosis.fixes.push('Connect your Instagram Business account in the app')
    } else {
      diagnosis.status.instagramAccount = '✅ Connected'
      diagnosis.status.instagramId = instagramAccount.providerAccountId || 'Unknown'
      
      // Check scope
      if (!instagramAccount.scope?.includes('instagram_manage_messages')) {
        diagnosis.issues.push('❌ Missing instagram_manage_messages permission')
        diagnosis.fixes.push('Reconnect Instagram account with proper Business permissions')
      }
    }

    // 3. Check Active Automations
    console.log(`🤖 [${requestId}] Checking automation configuration...`)
    const activeAutomations = await prisma.automation.findMany({
      where: { active: true, triggerType: 'comment' }
    })
    
    if (activeAutomations.length === 0) {
      diagnosis.issues.push('❌ No active comment automations found')
      diagnosis.fixes.push('Create and activate a comment automation with keywords')
    } else {
      diagnosis.status.activeAutomations = `✅ ${activeAutomations.length} active`
      
      // Check each automation
      for (const automation of activeAutomations) {
        const keywords = JSON.parse(automation.keywords || '[]')
        if (keywords.length === 0) {
          diagnosis.issues.push(`❌ Automation "${automation.name}" has no keywords`)
          diagnosis.fixes.push(`Add trigger keywords to automation "${automation.name}"`)
        }
        
        if (!automation.message && !automation.aiPrompt) {
          diagnosis.issues.push(`❌ Automation "${automation.name}" has no response message`)
          diagnosis.fixes.push(`Add a response message to automation "${automation.name}"`)
        }
      }
    }

    // 4. Test Webhook Verification
    console.log(`🪝 [${requestId}] Testing webhook verification...`)
    try {
      const verifyUrl = `${req.nextUrl.origin}/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN}&hub.challenge=test123`
      const verifyTest = await fetch(verifyUrl)
      
      if (verifyTest.ok) {
        const challenge = await verifyTest.text()
        if (challenge === 'test123') {
          diagnosis.status.webhookVerification = '✅ Working'
        } else {
          diagnosis.issues.push('❌ Webhook verification returns wrong challenge')
          diagnosis.fixes.push('Check INSTAGRAM_WEBHOOK_VERIFY_TOKEN in environment variables')
        }
      } else {
        diagnosis.issues.push('❌ Webhook verification endpoint failed')
        diagnosis.fixes.push('Check webhook endpoint is accessible')
      }
    } catch (error) {
      diagnosis.issues.push('❌ Webhook verification test failed')
      diagnosis.fixes.push('Check if server is running and accessible')
    }

    // 5. Check Instagram API Access
    console.log(`📡 [${requestId}] Testing Instagram API access...`)
    if (instagramAccount?.access_token) {
      try {
        const apiTest = await fetch(
          `https://graph.facebook.com/v18.0/${instagramAccount.providerAccountId}?fields=id,username&access_token=${instagramAccount.access_token}`
        )
        
        if (apiTest.ok) {
          const apiData = await apiTest.json()
          diagnosis.status.instagramAPI = `✅ Working (@${apiData.username})`
        } else {
          const error = await apiTest.text()
          diagnosis.issues.push('❌ Instagram API access failed')
          diagnosis.fixes.push('Reconnect Instagram account - token may be expired')
        }
      } catch (error) {
        diagnosis.issues.push('❌ Instagram API test failed')
        diagnosis.fixes.push('Check Instagram access token validity')
      }
    }

    // 6. Check Webhook Subscriptions
    console.log(`📡 [${requestId}] Checking webhook subscriptions...`)
    if (instagramAccount?.access_token) {
      try {
        const subTest = await fetch(
          `https://graph.facebook.com/v18.0/${instagramAccount.providerAccountId}/subscribed_apps?access_token=${instagramAccount.access_token}`
        )
        
        if (subTest.ok) {
          const subs = await subTest.json()
          if (subs.data && subs.data.length > 0) {
            diagnosis.status.webhookSubscriptions = '✅ Active subscriptions found'
          } else {
            diagnosis.issues.push('❌ No webhook subscriptions found')
            diagnosis.fixes.push('Subscribe to webhooks in Meta Developer Console')
          }
        }
      } catch (error) {
        diagnosis.issues.push('❌ Could not check webhook subscriptions')
      }
    }

    // 7. Critical Setup Issues
    if (diagnosis.issues.length === 0) {
      diagnosis.status.overall = '✅ All systems operational'
    } else {
      diagnosis.status.overall = `❌ ${diagnosis.issues.length} issues found`
    }

    // 8. Next Steps
    const nextSteps = [
      "1. Fix all issues listed above",
      "2. Go to Meta for Developers (developers.facebook.com)",
      "3. Select your Instagram app",
      "4. Navigate to Webhooks section", 
      "5. Ensure callback URL is: " + req.nextUrl.origin + "/api/webhooks/instagram",
      "6. Ensure subscribed to 'comments' and 'messages' fields",
      "7. Test by commenting on YOUR Instagram posts with your trigger keywords",
      "8. Monitor Vercel function logs for webhook activity"
    ]

    console.log(`✅ [${requestId}] Diagnosis completed`)

    return NextResponse.json({
      success: true,
      requestId,
      diagnosis,
      nextSteps,
      webhookUrl: `${req.nextUrl.origin}/api/webhooks/instagram`,
      verifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.substring(0, 10) + '...',
      testInstructions: {
        step1: "Fix all issues above",
        step2: "Comment with your trigger keyword on YOUR Instagram post", 
        step3: "Check Vercel function logs for webhook processing",
        step4: "You should receive exactly 1 DM (our duplicate fix is deployed)"
      }
    })

  } catch (error) {
    console.error(`💥 [${requestId}] Diagnosis failed:`, error)
    return NextResponse.json({
      error: 'Diagnosis failed',
      requestId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
