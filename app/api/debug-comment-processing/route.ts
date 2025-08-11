import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 DEBUGGING: Starting detailed comment processing debug")
    
    // Test data matching the TESTING automation
    const testCommentData = {
      id: `debug_comment_${Date.now()}`,
      text: "no", // Matches the TESTING automation keyword
      from: {
        id: "debug_user_123",
        username: "debuguser"
      },
      media: {
        id: "debug_post_456"
      },
      parent_id: null
    }
    
    const requestId = `debug_${Date.now()}`
    const instagramAccountId = "24695355950081100" // The correct account ID
    
    console.log(`🔍 [${requestId}] Processing test comment:`, testCommentData)
    
    const debugInfo: any = {
      testCommentData,
      requestId,
      instagramAccountId,
      steps: []
    }
    
    // Step 1: Check if we have comment text
    if (testCommentData.text) {
      debugInfo.steps.push("✅ Comment has text")
      
      const commentText = testCommentData.text.toLowerCase()
      const commentId = testCommentData.id
      const commenterId = testCommentData.from?.id
      const commenterUsername = testCommentData.from?.username
      const postId = testCommentData.media?.id
      const parentId = testCommentData.parent_id
      
      debugInfo.commentText = commentText
      debugInfo.commentId = commentId
      debugInfo.commenterId = commenterId
      debugInfo.commenterUsername = commenterUsername
      debugInfo.postId = postId
      debugInfo.parentId = parentId
      
      // Step 2: Get automation rules
      debugInfo.steps.push("🔍 Fetching automation rules...")
      
      const automations = await prisma.automation.findMany({
        where: {
          active: true
        },
        include: {
          user: true,
        },
      })
      
      const commentAutomations = automations.filter(a => 
        a.triggerType === "comment" || a.triggerType === "follow_comment"
      )
      
      debugInfo.steps.push(`✅ Found ${commentAutomations.length} active comment automations`)
      debugInfo.totalAutomations = automations.length
      debugInfo.commentAutomations = commentAutomations.length
      
      // Step 3: Process each automation
      let processedAutomations = 0
      
      for (const automation of commentAutomations) {
        const automationDebug: any = {
          id: automation.id,
          name: automation.name,
          userId: automation.userId,
          keywords: automation.keywords,
          steps: []
        }
        
        debugInfo.steps.push(`🔍 Processing automation: ${automation.name} (${automation.id})`)
        
        // Get user's Instagram account
        const userInstagramAccount = await prisma.account.findFirst({
          where: {
            userId: automation.userId,
            provider: "instagram",
          },
        })
        
        if (!userInstagramAccount) {
          automationDebug.steps.push(`❌ No Instagram account found for user ${automation.userId}`)
          debugInfo.steps.push(`❌ No Instagram account found for user ${automation.userId}`)
          continue
        }
        
        automationDebug.steps.push("✅ Instagram account found")
        automationDebug.instagramAccount = {
          providerAccountId: userInstagramAccount.providerAccountId,
          scope: userInstagramAccount.scope
        }
        
        // Check business permissions
        const isBusinessAccount = userInstagramAccount.scope?.includes("instagram_manage_messages") || 
                                  userInstagramAccount.scope?.includes("instagram_manage_comments")
        
        if (!isBusinessAccount) {
          automationDebug.steps.push(`❌ Account ${userInstagramAccount.providerAccountId} doesn't have business permissions`)
          debugInfo.steps.push(`❌ Account doesn't have business permissions`)
          continue
        }
        
        automationDebug.steps.push("✅ Business permissions confirmed")
        
        // Check Instagram account match
        if (userInstagramAccount.providerAccountId !== instagramAccountId) {
          automationDebug.steps.push(`❌ Account mismatch: ${userInstagramAccount.providerAccountId} vs ${instagramAccountId}`)
          debugInfo.steps.push(`❌ Account mismatch for automation ${automation.id}`)
          continue
        }
        
        automationDebug.steps.push("✅ Instagram account match confirmed")
        debugInfo.steps.push(`✅ Account match confirmed for ${automation.name}`)
        
        // Don't reply to business account's own comments
        if (commenterId === userInstagramAccount.providerAccountId) {
          automationDebug.steps.push("❌ Skipping own comment")
          debugInfo[`automation_${automation.id}`] = automationDebug
          continue
        }
        
        // Don't reply to replies (only top-level comments)
        if (parentId) {
          automationDebug.steps.push("❌ Skipping reply to comment")
          debugInfo[`automation_${automation.id}`] = automationDebug
          continue
        }
        
        automationDebug.steps.push("✅ Comment is top-level")
        
        // Check posts filter
        let postsToCheck: string[] = []
        try {
          postsToCheck = automation.posts ? JSON.parse(automation.posts) : []
        } catch (e) {
          postsToCheck = []
        }
        
        if (postsToCheck.length > 0 && !postsToCheck.includes(postId)) {
          automationDebug.steps.push(`❌ Comment not on selected posts: ${postId} not in [${postsToCheck.join(', ')}]`)
          debugInfo[`automation_${automation.id}`] = automationDebug
          continue
        }
        
        automationDebug.steps.push("✅ Post filter passed")
        
        // Check keywords
        let keywords: string[] = []
        try {
          keywords = typeof automation.keywords === 'string' ? 
            JSON.parse(automation.keywords) : automation.keywords
        } catch (e) {
          keywords = []
        }
        
        automationDebug.keywords = keywords
        automationDebug.steps.push(`🔍 Checking keywords [${keywords.join(', ')}] against "${commentText}"`)
        
        const hasMatchingKeyword = keywords.some(keyword => 
          commentText.includes(keyword.toLowerCase())
        )
        
        if (hasMatchingKeyword) {
          automationDebug.steps.push("🎯 Keyword match found!")
          debugInfo.steps.push(`🎯 Keyword match found for ${automation.name}!`)
          
          // This is where we would normally process the automation
          // For debugging, let's see if we would create an automation log
          
          try {
            // Test creating an automation log
            const logResult = await prisma.automationLog.create({
              data: {
                automationId: automation.id,
                triggerType: "comment",
                triggerText: testCommentData.text,
                userId: commenterId,
                username: commenterUsername,
                isNewFollower: false,
                triggeredAt: new Date(),
              },
            })
            
            automationDebug.steps.push("✅ Automation log created successfully!")
            automationDebug.logId = logResult.id
            debugInfo.steps.push(`✅ Created automation log ${logResult.id}`)
            processedAutomations++
            
          } catch (logError) {
            automationDebug.steps.push(`❌ Failed to create automation log: ${logError}`)
            debugInfo.steps.push(`❌ Failed to create automation log: ${logError}`)
          }
          
        } else {
          automationDebug.steps.push("❌ No keyword match")
        }
        
        debugInfo[`automation_${automation.id}`] = automationDebug
      }
      
      debugInfo.processedAutomations = processedAutomations
      debugInfo.steps.push(`✅ Debug completed. Processed ${processedAutomations} automations`)
      
    } else {
      debugInfo.steps.push("❌ No comment text found")
    }
    
    return NextResponse.json({
      success: true,
      message: "Debug comment processing completed",
      debug: debugInfo,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Debug comment processing error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
