import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Deep debugging Instagram comment processing logic")
    
    // Test data that should match
    const commentData = {
      id: `${Date.now()}_debug`,
      text: "no",
      from: {
        id: "1960009881070275",
        username: "md._.jameel"
      },
      media: {
        id: "18080571787866479"
      },
      parent_id: null
    }
    
    const requestId = `debug_${Date.now()}`
    const instagramAccountId = "24695355950081100"
    
    console.log("📋 Test parameters:")
    console.log("- Comment text:", commentData.text)
    console.log("- Commenter ID:", commentData.from.id)
    console.log("- Instagram account ID:", instagramAccountId)
    
    // Step 1: Check if automation exists
    const automations = await prisma.automation.findMany({
      where: {
        active: true,
        triggerType: "comment"
      },
      include: {
        user: true
      }
    })
    
    console.log(`📊 Found ${automations.length} active comment automations`)
    
    for (const automation of automations) {
      console.log(`🔍 Automation ${automation.id}:`)
      console.log(`- User ID: ${automation.userId}`)
      console.log(`- Keywords: ${automation.keywords}`)
      
      // Step 2: Check user's Instagram account
      const userAccount = await prisma.account.findFirst({
        where: {
          userId: automation.userId,
          provider: "instagram"
        }
      })
      
      console.log(`- User's Instagram account: ${userAccount?.providerAccountId}`)
      console.log(`- Account matches webhook: ${userAccount?.providerAccountId === instagramAccountId}`)
      
      if (!userAccount) {
        console.log(`❌ No Instagram account for user ${automation.userId}`)
        continue
      }
      
      if (userAccount.providerAccountId !== instagramAccountId) {
        console.log(`❌ Account mismatch: ${userAccount.providerAccountId} vs ${instagramAccountId}`)
        continue
      }
      
      // Step 3: Check business permissions
      const hasBusinessScopes = userAccount.scope?.includes("instagram_manage_messages") || 
                               userAccount.scope?.includes("instagram_manage_comments")
      console.log(`- Has business scopes: ${hasBusinessScopes}`)
      
      if (!hasBusinessScopes) {
        console.log(`❌ No business permissions`)
        continue
      }
      
      // Step 4: Check if commenter is the business account owner
      if (commentData.from.id === userAccount.providerAccountId) {
        console.log(`❌ Commenter is business account owner - preventing infinite loop`)
        continue
      }
      
      // Step 5: Check parent_id (replies)
      if (commentData.parent_id) {
        console.log(`❌ Comment is a reply, skipping`)
        continue
      }
      
      // Step 6: Check posts filter
      let postsToCheck: string[] = []
      try {
        postsToCheck = automation.posts ? JSON.parse(automation.posts) : []
      } catch (e) {
        postsToCheck = []
      }
      
      console.log(`- Posts filter: ${postsToCheck.join(', ') || 'none'}`)
      
      if (postsToCheck.length > 0 && !postsToCheck.includes(commentData.media.id)) {
        console.log(`❌ Comment not on selected posts`)
        continue
      }
      
      // Step 7: Check keywords
      let keywords: string[] = []
      try {
        keywords = typeof automation.keywords === 'string' ? 
          JSON.parse(automation.keywords) : automation.keywords
      } catch (e) {
        keywords = []
      }
      
      console.log(`- Keywords: ${keywords.join(', ')}`)
      const commentText = commentData.text.toLowerCase()
      console.log(`- Comment text (lowercase): "${commentText}"`)
      
      const hasMatchingKeyword = keywords.some(keyword => {
        const match = commentText.includes(keyword.toLowerCase())
        console.log(`  - "${keyword.toLowerCase()}" matches: ${match}`)
        return match
      })
      
      console.log(`- Has matching keyword: ${hasMatchingKeyword}`)
      
      if (!hasMatchingKeyword) {
        console.log(`❌ No keyword match`)
        continue
      }
      
      // Step 8: Check recent duplicate
      const recentLog = await prisma.automationLog.findFirst({
        where: {
          userId: commentData.from.id,
          triggerText: commentData.text,
          triggeredAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000)
          }
        },
        orderBy: { triggeredAt: 'desc' }
      })
      
      console.log(`- Recent duplicate log: ${recentLog ? 'found' : 'none'}`)
      
      if (recentLog) {
        console.log(`❌ Recent duplicate found at ${recentLog.triggeredAt}`)
        continue
      }
      
      console.log(`✅ All checks passed! This automation should trigger!`)
      
      // Try to create an automation log manually
      try {
        const newLog = await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            triggerType: "comment",
            triggerText: commentData.text,
            userId: commentData.from.id,
            username: commentData.from.username,
            isNewFollower: false
          }
        })
        console.log(`✅ Successfully created automation log: ${newLog.id}`)
      } catch (createError) {
        console.error(`❌ Failed to create automation log:`, createError)
      }
    }
    
    // Get final log count
    const finalLogCount = await prisma.automationLog.count()
    
    return NextResponse.json({
      success: true,
      message: "Deep debug completed",
      automationsFound: automations.length,
      finalLogCount,
      testData: {
        requestId,
        commentData,
        instagramAccountId
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Deep debug error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
