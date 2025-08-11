import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { Redis } from '@upstash/redis'

export async function GET(req: NextRequest) {
  const requestId = `automation_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Starting comprehensive automation test...`)
    
    const results = {
      instagram: { status: 'not_tested' } as any,
      automations: { status: 'not_tested' } as any,
      queue: { status: 'not_tested' } as any,
      webhook: { status: 'not_tested' } as any,
      messaging: { status: 'not_tested' } as any,
      issues: [] as string[],
      fixes: [] as string[]
    }
    
    // Test 1: Instagram Token & Permissions
    console.log(`🧪 [${requestId}] Testing Instagram connection...`)
    try {
      const instagramAccounts = await prisma.account.findMany({
        where: { provider: "instagram" }
      })
      
      if (instagramAccounts.length === 0) {
        results.instagram = { status: 'no_account', error: 'No Instagram account connected' }
        results.issues.push("No Instagram account found")
        results.fixes.push("Connect Instagram account in dashboard")
      } else {
        const account = instagramAccounts[0]
        results.instagram = {
          status: 'found',
          accountId: account.providerAccountId,
          hasToken: !!account.access_token,
          scope: account.scope,
          hasMessagingScope: account.scope?.includes("instagram_manage_messages"),
          hasCommentsScope: account.scope?.includes("instagram_manage_comments")
        }
        
        // Test token validity
        if (account.access_token) {
          try {
            const response = await fetch(
              `https://graph.facebook.com/v18.0/${account.providerAccountId}?fields=id,username,account_type&access_token=${account.access_token}`
            )
            
            if (response.ok) {
              const data = await response.json()
              results.instagram.tokenValid = true
              results.instagram.accountType = data.account_type
              results.instagram.username = data.username
              
              if (data.account_type !== "BUSINESS") {
                results.issues.push("Instagram account is not a business account")
                results.fixes.push("Convert Instagram account to Business account")
              }
            } else {
              results.instagram.tokenValid = false
              results.issues.push("Instagram token is invalid or expired")
              results.fixes.push("Reconnect Instagram account with fresh token")
            }
          } catch (error) {
            results.instagram.tokenValid = false
            results.instagram.tokenError = error instanceof Error ? error.message : "Unknown error"
          }
        }
        
        // Check permissions
        if (!account.scope?.includes("instagram_manage_messages")) {
          results.issues.push("Missing instagram_manage_messages permission")
          results.fixes.push("Generate new token with instagram_manage_messages permission")
        }
        
        if (!account.scope?.includes("instagram_manage_comments")) {
          results.issues.push("Missing instagram_manage_comments permission") 
          results.fixes.push("Generate new token with instagram_manage_comments permission")
        }
      }
    } catch (error) {
      results.instagram = { 
        status: 'error', 
        error: error instanceof Error ? error.message : "Unknown error" 
      }
    }
    
    // Test 2: Active Automations
    console.log(`🧪 [${requestId}] Testing automations...`)
    try {
      const automations = await prisma.automation.findMany({
        where: { active: true }
      })
      
      results.automations = {
        status: 'checked',
        count: automations.length,
        automations: automations.map(a => ({
          id: a.id,
          name: a.name,
          triggerType: a.triggerType,
          actionType: a.actionType,
          keywords: a.keywords,
          posts: a.posts
        }))
      }
      
      if (automations.length === 0) {
        results.issues.push("No active automations found")
        results.fixes.push("Create and activate automations in dashboard")
      }
    } catch (error) {
      results.automations = { 
        status: 'error', 
        error: error instanceof Error ? error.message : "Unknown error" 
      }
    }
    
    // Test 3: Redis Queue
    console.log(`🧪 [${requestId}] Testing Redis queue...`)
    try {
      if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
        const redis = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        })
        
        // Check queue status
        const queueLength = await redis.llen('instagram:events')
        const queueSample = await redis.lrange('instagram:events', 0, 2)
        
        results.queue = {
          status: 'connected',
          queueLength,
          sampleEvents: queueSample,
          redisWorking: true
        }
        
        if (queueLength > 100) {
          results.issues.push(`Large queue backlog: ${queueLength} events`)
          results.fixes.push("Check if queue processor is running properly")
        }
      } else {
        results.queue = { status: 'no_redis_config' }
        results.issues.push("Redis not configured")
      }
    } catch (error) {
      results.queue = { 
        status: 'error', 
        error: error instanceof Error ? error.message : "Unknown error" 
      }
    }
    
    // Test 4: Messaging Test (if we have proper token)
    console.log(`🧪 [${requestId}] Testing messaging capability...`)
    if (results.instagram.hasMessagingScope && results.instagram.tokenValid) {
      try {
        const account = await prisma.account.findFirst({
          where: { provider: "instagram" }
        })
        
        if (account?.access_token) {
          // Test if we can get conversations (doesn't actually send)
          const conversationsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${account.providerAccountId}/conversations?access_token=${account.access_token}`
          )
          
          if (conversationsResponse.ok) {
            results.messaging = {
              status: 'capable',
              canAccessConversations: true
            }
          } else {
            const errorText = await conversationsResponse.text()
            results.messaging = {
              status: 'error',
              canAccessConversations: false,
              error: errorText
            }
            results.issues.push("Cannot access Instagram conversations")
            results.fixes.push("Check Instagram Business account setup and permissions")
          }
        }
      } catch (error) {
        results.messaging = {
          status: 'error',
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    } else {
      results.messaging = {
        status: 'no_permission',
        reason: 'Missing messaging scope or invalid token'
      }
    }
    
    // Summary
    const summary = {
      totalIssues: results.issues.length,
      criticalIssues: results.issues.filter(issue => 
        issue.includes('Missing instagram_manage') || 
        issue.includes('No Instagram account') ||
        issue.includes('token is invalid')
      ).length,
      status: results.issues.length === 0 ? 'ready' : 'needs_fixes'
    }
    
    console.log(`✅ [${requestId}] Automation test completed - ${summary.status}`)
    
    return NextResponse.json({
      success: true,
      requestId,
      results,
      summary,
      recommendations: results.fixes
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Automation test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 