import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = `simple_webhook_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Testing simple webhook processing...`)
    
    // 1. First, remove post restrictions from ALL your automations
    const updateResult = await prisma.automation.updateMany({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        triggerType: "comment",
        active: true
      },
      data: {
        posts: "[]" // Remove ALL post restrictions
      }
    })
    
    console.log(`🧪 [${requestId}] Updated ${updateResult.count} automations to remove post restrictions`)
    
    // 2. Get your Instagram account
    const instagramAccount = await prisma.account.findFirst({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        provider: "instagram"
      }
    })
    
    if (!instagramAccount) {
      throw new Error("Instagram account not found")
    }
    
    // 3. Get your active comment automations
    const automations = await prisma.automation.findMany({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        triggerType: "comment",
        active: true
      }
    })
    
    console.log(`🧪 [${requestId}] Found ${automations.length} active comment automations`)
    
    // 4. Test comment processing logic
    let automationFound = false
    let keywordMatched = false
    let responseReady = false
    
    for (const automation of automations) {
      automationFound = true
      const keywords = JSON.parse(automation.keywords || '[]')
      console.log(`🧪 [${requestId}] Testing automation "${automation.name}" with keywords: ${keywords.join(', ')}`)
      
      if (keywords.includes("hello")) {
        keywordMatched = true
        console.log(`🧪 [${requestId}] Keyword "hello" matched!`)
        
        if (automation.commentReply) {
          responseReady = true
          console.log(`🧪 [${requestId}] Response ready: "${automation.commentReply}"`)
        }
      }
    }
    
    // 5. Test Instagram API access  
    let apiWorking = false
    try {
      const testResponse = await fetch(
        `https://graph.instagram.com/v18.0/${instagramAccount.providerAccountId}?fields=id,username&access_token=${instagramAccount.access_token}`
      )
      
      if (testResponse.ok) {
        apiWorking = true
        console.log(`🧪 [${requestId}] Instagram API access confirmed`)
      }
    } catch (error) {
      console.log(`🧪 [${requestId}] Instagram API test failed:`, error)
    }
    
    const allSystemsGo = automationFound && keywordMatched && responseReady && apiWorking
    
    return NextResponse.json({
      success: true,
      requestId,
      status: allSystemsGo ? "🎉 ALL SYSTEMS GO!" : "❌ Issues found",
      tests: {
        postRestrictionsRemoved: updateResult.count > 0,
        automationFound,
        keywordMatched,
        responseReady,
        apiWorking
      },
      message: allSystemsGo 
        ? "✅ Your automation should now work! Comment 'hello' on ANY of your Instagram posts."
        : "❌ Some issues need fixing",
      automations: automations.map(a => ({
        id: a.id,
        name: a.name,
        keywords: JSON.parse(a.keywords || '[]'),
        response: a.commentReply,
        posts: a.posts
      }))
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Simple webhook test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Fix needed: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
} 