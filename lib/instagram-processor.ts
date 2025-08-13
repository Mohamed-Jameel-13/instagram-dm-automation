import { prisma } from "@/lib/db"

// Ensure we're using Node.js runtime for database operations
import { followerTracker } from "@/lib/follower-tracker"
import { ConversationManager } from "@/lib/conversation-manager"
import { Redis } from '@upstash/redis'
import { DuplicateResponsePrevention } from "./duplicate-prevention"
import { GlobalDuplicatePrevention } from "./global-duplicate-prevention"
import { UltraDuplicatePrevention } from "./ultra-duplicate-prevention"
import { NuclearDuplicatePrevention } from "./nuclear-duplicate-prevention"

// Temporarily disable Redis caching to avoid compatibility issues
let redis: Redis | null = null
try {
  // TEMPORARILY DISABLED: Redis has compatibility issues
  // Re-enable after fixing Redis client compatibility  
  if (false && process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  }
} catch (error) {
  console.warn('Redis not configured, falling back to database-only mode')
}

// Cache automation rules for 5 minutes to reduce DB hits
export async function getAutomationRules(userId?: string, active = true) {
  const cacheKey = userId ? `automation_rules:${userId}` : 'automation_rules:all'
  
  try {
    // Check cache first (if Redis is available)
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit for automation rules: ${cacheKey}`)
        return cached as any[]
      }
    }
    
    // Fetch from database
    console.log(`🔍 ${redis ? 'Cache miss,' : 'No cache,'} fetching from DB: ${cacheKey}`)
    const rules = await prisma.automation.findMany({
      where: {
        ...(userId && { userId }),
        active
      },
      include: {
        user: true,
      },
    })
    
    // Cache for 5 minutes (if Redis is available)
    if (redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(rules))
    }
    
    return rules
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    // Fallback to DB if Redis fails
    return await prisma.automation.findMany({
      where: {
        ...(userId && { userId }),
        active
      },
      include: {
        user: true,
      },
    })
  }
}

// Main event processor
export async function processInstagramEvent(eventData: any) {
  const { requestId, body } = eventData
  
  console.log(`🔄 [${requestId}] Starting event processing with duplicate prevention...`)
  
  // Use duplicate prevention wrapper
  return await DuplicateResponsePrevention.processWithDuplicatePrevention(
    body,
    async () => {
      
      if (body.object === "instagram") {
        for (const entry of body.entry) {
          console.log(`📝 [${requestId}] Processing entry:`, JSON.stringify(entry, null, 2))
          
          const instagramAccountId = entry.id // This is the Instagram account that received the event
          console.log(`📝 [${requestId}] Instagram account ID from webhook: ${instagramAccountId}`)
          
          // Handle Direct Messages
          if (entry.messaging) {
            console.log(`💬 [${requestId}] Found ${entry.messaging.length} messaging events`)
            
            for (const event of entry.messaging) {
              await handleInstagramMessage(event, requestId, instagramAccountId)
            }
          }
          
          // Handle Comments
          if (entry.changes) {
            console.log(`💭 [${requestId}] Found ${entry.changes.length} comment events`)
            
            for (const change of entry.changes) {
           if (change.field === "comments") {
             // Ensure we only process add events (not edits/deletes)
             const value = change.value
             const hasText = !!(value?.text || value?.message)
             if (!hasText) {
               console.log(`ℹ️ [${requestId}] Skipping non-text comment change event`)
               continue
             }
             await handleInstagramComment(value, requestId, instagramAccountId)
           }
            }
          }
        }
      }
      
      console.log(`✅ [${requestId}] Event processing completed successfully`)
      return { success: true, requestId }
    }
  )
}

async function handleInstagramMessage(event: any, requestId: string, instagramAccountId: string) {
  console.log(`📨 [${requestId}] Processing Instagram DM:`, event)
  
  // Only process incoming messages (not sent by our bot)
  if (event.message && event.message.text && !event.message.is_echo) {
    const messageText = event.message.text.toLowerCase()
    const senderId = event.sender.id
    const recipientId = event.recipient.id
    
    try {
      // Get cached automation rules
      const automations = await getAutomationRules(undefined, true)
      const dmAutomations = automations.filter(a => a.triggerType === "dm")
      
      console.log(`🔍 [${requestId}] Found ${dmAutomations.length} active DM automations`)
      
      // Check for active AI conversations first
      let activeConversationFound = false
      
      for (const automation of dmAutomations) {
        // Get user's Instagram account
        const userInstagramAccount = await prisma.account.findFirst({
          where: {
            userId: automation.userId,
            provider: "instagram",
          },
        })
        
        if (!userInstagramAccount) {
          console.log(`❌ [${requestId}] No Instagram account found for automation user ${automation.userId}`)
          continue
        }
        
        // CRITICAL FIX: Check if this Instagram account is the one receiving the webhook event
        let isAccountMatch = userInstagramAccount.providerAccountId === instagramAccountId
        
        if (!isAccountMatch) {
          console.log(`❌ [${requestId}] Instagram account mismatch: automation owner has ${userInstagramAccount.providerAccountId}, webhook is for ${instagramAccountId}`)
          console.log(`🔄 [${requestId}] Attempting to update stored account ID to match webhook...`)
          
          // Try to update the account ID to match the webhook
          try {
            await prisma.account.update({
              where: { id: userInstagramAccount.id },
              data: { providerAccountId: instagramAccountId }
            })
            console.log(`✅ [${requestId}] Updated Instagram account ID from ${userInstagramAccount.providerAccountId} to ${instagramAccountId}`)
            isAccountMatch = true
          } catch (updateError) {
            console.log(`❌ [${requestId}] Failed to update account ID: ${updateError}`)
            continue
          }
        }
        
        if (!isAccountMatch) {
          continue
        }
        
        console.log(`✅ [${requestId}] Instagram account match confirmed: ${userInstagramAccount.providerAccountId}`)
        
        // Check if business account - try dynamic token validation first, fallback to scope check
        let isBusinessAccount = userInstagramAccount.scope?.includes("instagram_manage_messages") || 
                               userInstagramAccount.scope?.includes("instagram_manage_comments")
        
        // If scope check fails, test token capabilities dynamically
        if (!isBusinessAccount && userInstagramAccount.access_token) {
          console.log(`🔍 [${requestId}] Scope check failed, testing token capabilities dynamically...`)
          try {
            // Test Business API first
            let testResponse = await fetch(
              `https://graph.facebook.com/v18.0/${userInstagramAccount.providerAccountId}?fields=id,username,account_type&access_token=${userInstagramAccount.access_token}`
            )
            
            if (testResponse.ok) {
              const accountData = await testResponse.json()
              console.log(`✅ [${requestId}] Business API token validation successful - account type: ${accountData.account_type}`)
              isBusinessAccount = true // Token works, allow automation
              
              // Update scope in database for future use
              await prisma.account.update({
                where: { id: userInstagramAccount.id },
                data: { 
                  scope: "instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement" 
                }
              })
              console.log(`✅ [${requestId}] Updated account scope in database`)
            } else {
              console.log(`❌ [${requestId}] Business API failed (${testResponse.status}), trying Basic Display API...`)
              
              // Try Basic Display API as fallback
              testResponse = await fetch(
                `https://graph.instagram.com/me?fields=id,username&access_token=${userInstagramAccount.access_token}`
              )
              
              if (testResponse.ok) {
                const accountData = await testResponse.json()
                console.log(`✅ [${requestId}] Basic Display API token validation successful for user: ${accountData.username}`)
                
                // For Basic Display API, we'll allow automation but with limited scope
                isBusinessAccount = true // Allow automation with basic token
                
                // Update scope in database for future use
                await prisma.account.update({
                  where: { id: userInstagramAccount.id },
                  data: { 
                    scope: "user_profile,user_media,instagram_basic_access" 
                  }
                })
                console.log(`✅ [${requestId}] Updated account scope to basic access in database`)
              } else {
                console.log(`❌ [${requestId}] Both Business and Basic Display API validation failed`)
              }
            }
          } catch (error) {
            console.log(`❌ [${requestId}] Error testing token: ${error}`)
          }
        }
        
        if (!isBusinessAccount) {
          console.log(`❌ [${requestId}] Instagram account ${userInstagramAccount.providerAccountId} doesn't have business permissions`)
          continue
        }
        
        if (automation.actionType === "ai") {
          const conversationStatus = await ConversationManager.isInActiveConversation(
            automation.userId,
            senderId
          )
          
          if (conversationStatus.isActive && conversationStatus.automationId === automation.id) {
            console.log(`💬 [${requestId}] User ${senderId} in active AI conversation`)
            activeConversationFound = true
            
            await ConversationManager.addMessageToConversation(
              automation.userId,
              senderId,
              automation.id,
              "user",
              messageText
            )
            
            await sendInstagramAIMessage(senderId, automation, recipientId, messageText, requestId)
            await logAutomationTrigger(automation.id, "dm_conversation", messageText, senderId)
            break
          }
        }
      }
      
      // If no active conversation, check for keyword triggers
      if (!activeConversationFound) {
        for (const automation of dmAutomations) {
          // Get user's Instagram account
          const userInstagramAccount = await prisma.account.findFirst({
            where: {
              userId: automation.userId,
              provider: "instagram",
            },
          })
          
          if (!userInstagramAccount) {
            console.log(`❌ [${requestId}] No Instagram account found for automation user ${automation.userId}`)
            continue
          }
          
          // CRITICAL FIX: Check if this Instagram account is the one receiving the webhook event
          if (userInstagramAccount.providerAccountId !== instagramAccountId) {
            console.log(`❌ [${requestId}] Instagram account mismatch: automation owner has ${userInstagramAccount.providerAccountId}, webhook is for ${instagramAccountId}`)
            continue
          }
          
          console.log(`✅ [${requestId}] Instagram account match confirmed: ${userInstagramAccount.providerAccountId}`)
          
          // Check if business account
          const isBusinessAccount = userInstagramAccount.scope?.includes("instagram_manage_messages") || 
                                    userInstagramAccount.scope?.includes("instagram_manage_comments")
          
          if (!isBusinessAccount) {
            console.log(`❌ [${requestId}] Instagram account ${userInstagramAccount.providerAccountId} doesn't have business permissions`)
            continue
          }
          
          // Check keywords
          const keywords = JSON.parse(automation.keywords) as string[]
          console.log(`🔍 [${requestId}] Checking keywords ${keywords.join(', ')} against message "${messageText}"`)
          
          const hasMatchingKeyword = keywords.some(keyword => 
            messageText.includes(keyword.toLowerCase())
          )
          
          if (hasMatchingKeyword) {
            console.log(`🎯 [${requestId}] Keyword match found! Triggering automation ${automation.id}`)
            
            if (automation.actionType === "ai") {
              await ConversationManager.startConversation(
                automation.userId,
                senderId,
                automation.id,
                messageText
              )
            }
            
            await sendInstagramMessage(senderId, automation, recipientId, requestId)
            await logAutomationTrigger(automation.id, "dm", messageText, senderId)
            break
          } else {
            console.log(`❌ [${requestId}] No keyword match for automation ${automation.id}`)
          }
        }
      }
      
    } catch (error) {
      console.error(`💥 [${requestId}] Error handling Instagram message:`, error)
      throw error
    }
  }
}

export async function handleInstagramComment(commentData: any, requestId: string, instagramAccountId: string) {
  console.log(`💭 [${requestId}] Processing Instagram comment payload:`)
  try {
    console.log(JSON.stringify(commentData, null, 2))
  } catch (_) {
    console.log('[payload not serializable]')
  }
  
  if (!commentData || (!commentData.text && !commentData.message)) {
    console.log(`❌ [${requestId}] Comment payload missing text. Keys: ${Object.keys(commentData || {}).join(', ')}`)
    return
  }

  // Support both text and message fields just in case payload differs
  const rawText = commentData.text || commentData.message
  if (rawText) {
    const commentText = String(rawText).toLowerCase()
    const commentId = commentData.id || commentData.comment_id
    const commenterId = commentData.from?.id
    const commenterUsername = commentData.from?.username
    const postId = commentData.media?.id || commentData.media_id
    const parentId = commentData.parent_id
    
    // REAL USER BYPASS: Allow real Instagram users to bypass duplicate prevention
    const isRealInstagramUser = commenterId && commenterId !== 'debug_user_123' && !commenterId.startsWith('test_') && commenterId.length > 10
    
    if (isRealInstagramUser) {
      console.log(`✅ [${requestId}] REAL USER BYPASS: Allowing real Instagram user ${commenterId} (${commenterUsername}) to bypass duplicate prevention`)
    } else {
      // ULTRA DUPLICATE PREVENTION - Check at the very beginning (only for test users)
      console.log(`🛡️ [${requestId}] ULTRA CHECK: Testing duplicate prevention for comment ${commentId} by user ${commenterId}`)
      
      // We don't know the automation ID yet, so check for any automation for this user/comment combo
      if (!UltraDuplicatePrevention.canSendMessage(commentId, commenterId, 'any')) {
        console.log(`🚫 [${requestId}] ULTRA BLOCKED: Comment processing blocked by ultra duplicate prevention`)
        return // Exit immediately - do not process this comment at all
      }
    }
    
    // CRITICAL FIX: Create a unique processing key to prevent duplicates
    const processingKey = `comment_${commentId}_${commenterId}_${commentText.slice(0, 50)}`
    
    // Check if we've already processed this exact comment (skip for real Instagram users)
    if (!isRealInstagramUser) {
      const recentLog = await prisma.automationLog.findFirst({
        where: {
          userId: commenterId,
          triggerText: rawText,
          triggeredAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
          }
        },
        orderBy: { triggeredAt: 'desc' }
      })
      
      if (recentLog) {
        console.log(`🚫 [${requestId}] DB BLOCK: Comment already processed recently at ${recentLog.triggeredAt}, skipping duplicate`)
        return
      }
    } else {
      console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping recent duplicate check for real Instagram user`)
    }
    
    try {
      // Get cached automation rules for comments
      const automations = await getAutomationRules(undefined, true)
      const commentAutomations = automations.filter(a => 
        a.triggerType === "comment" || a.triggerType === "follow_comment"
      )
      
      console.log(`🔍 [${requestId}] Found ${commentAutomations.length} active comment automations`)
      
      for (const automation of commentAutomations) {
        // Get user's Instagram account
        const userInstagramAccount = await prisma.account.findFirst({
          where: {
            userId: automation.userId,
            provider: "instagram",
          },
        })
        
        if (!userInstagramAccount) {
          console.log(`❌ [${requestId}] No Instagram account found for automation user ${automation.userId}`)
          continue
        }
        
        // CRITICAL FIX: Check if this Instagram account is the one receiving the webhook event
        // Note: Same Instagram account can have different IDs (User ID vs Business ID)
        let isAccountMatch = userInstagramAccount.providerAccountId === instagramAccountId
        
        if (!isAccountMatch) {
          console.log(`❌ [${requestId}] Instagram account mismatch: automation owner has ${userInstagramAccount.providerAccountId}, webhook is for ${instagramAccountId}`)
          console.log(`🔄 [${requestId}] Attempting to update stored account ID to match webhook...`)
          
          // Try to update the account ID to match the webhook
          try {
            await prisma.account.update({
              where: { id: userInstagramAccount.id },
              data: { providerAccountId: instagramAccountId }
            })
            console.log(`✅ [${requestId}] Updated Instagram account ID from ${userInstagramAccount.providerAccountId} to ${instagramAccountId}`)
            isAccountMatch = true
          } catch (updateError) {
            console.log(`❌ [${requestId}] Failed to update account ID: ${updateError}`)
            continue
          }
        }
        
        if (!isAccountMatch) {
          continue
        }

        // Check if business account (after confirming match for clearer diagnostics)
        let isBusinessAccount = userInstagramAccount.scope?.includes("instagram_manage_messages") || 
                               userInstagramAccount.scope?.includes("instagram_manage_comments")
        
        // If scope check fails, test token capabilities dynamically
        if (!isBusinessAccount && userInstagramAccount.access_token) {
          console.log(`🔍 [${requestId}] Scope check failed, testing token capabilities dynamically...`)
          try {
            // Test Business API first
            let testResponse = await fetch(
              `https://graph.facebook.com/v18.0/${userInstagramAccount.providerAccountId}?fields=id,username,account_type&access_token=${userInstagramAccount.access_token}`
            )
            
            if (testResponse.ok) {
              const accountData = await testResponse.json()
              console.log(`✅ [${requestId}] Business API token validation successful - account type: ${accountData.account_type}`)
              isBusinessAccount = true // Token works, allow automation
              
              // Update scope in database for future use
              await prisma.account.update({
                where: { id: userInstagramAccount.id },
                data: { 
                  scope: "instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement" 
                }
              })
              console.log(`✅ [${requestId}] Updated account scope in database`)
            } else {
              console.log(`❌ [${requestId}] Business API failed (${testResponse.status}), trying Basic Display API...`)
              
              // Try Basic Display API as fallback
              testResponse = await fetch(
                `https://graph.instagram.com/me?fields=id,username&access_token=${userInstagramAccount.access_token}`
              )
              
              if (testResponse.ok) {
                const accountData = await testResponse.json()
                console.log(`✅ [${requestId}] Basic Display API token validation successful for user: ${accountData.username}`)
                
                // For Basic Display API, we'll allow automation but with limited scope
                isBusinessAccount = true // Allow automation with basic token
                
                // Update scope in database for future use
                await prisma.account.update({
                  where: { id: userInstagramAccount.id },
                  data: { 
                    scope: "user_profile,user_media,instagram_basic_access" 
                  }
                })
                console.log(`✅ [${requestId}] Updated account scope to basic access in database`)
              } else {
                console.log(`❌ [${requestId}] Both Business and Basic Display API validation failed`)
              }
            }
          } catch (error) {
            console.log(`❌ [${requestId}] Error testing token: ${error}`)
          }
        }
        
        if (!isBusinessAccount) {
          console.log(`❌ [${requestId}] Instagram account ${userInstagramAccount.providerAccountId} doesn't have business permissions`)
          continue
        }
        
        console.log(`✅ [${requestId}] Instagram account match confirmed: ${userInstagramAccount.providerAccountId}`)
        
        // Prevent infinite loops - don't reply to business account's own comments
        if (commenterId === userInstagramAccount.providerAccountId) continue
        
        // Don't reply to replies (only top-level comments)
        if (parentId) continue
        
        // Check if comment is on selected posts
        let postsToCheck: string[] = []
        try {
          postsToCheck = automation.posts ? JSON.parse(automation.posts) : []
        } catch (e) {
          postsToCheck = []
        }
        
        if (postsToCheck.length > 0 && postId && !postsToCheck.includes(postId)) {
          console.log(`❌ [${requestId}] Comment not on selected posts. Comment on ${postId}, automation configured for ${postsToCheck.join(', ')}`)
          continue
        }
        
        // Check keywords
        let keywords: string[] = []
        try {
          keywords = typeof automation.keywords === 'string' ? 
            JSON.parse(automation.keywords) : automation.keywords
        } catch (e) {
          keywords = []
        }
        
        console.log(`🔍 [${requestId}] Checking keywords ${keywords.join(', ')} against comment "${commentText}"`)
        
        const hasMatchingKeyword = keywords.some(keyword => 
          commentText.includes(keyword.toLowerCase())
        )
        
        if (hasMatchingKeyword) {
          console.log(`🎯 [${requestId}] Keyword match found! Checking for duplicates...`)
          
          // NUCLEAR OPTION: Double-check with global system before any processing (skip for real users)
          if (!isRealInstagramUser) {
            const testMessage = automation.message || "test message"
            if (!GlobalDuplicatePrevention.canSendMessage(commentId, commenterId, automation.id, testMessage)) {
              console.log(`🚫 [${requestId}] NUCLEAR BLOCK: Global duplicate prevention blocked this comment processing`)
              continue // Skip to next automation
            }
          } else {
            console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping global duplicate prevention for real Instagram user`)
          }
          
          // ENHANCED DUPLICATE PREVENTION: Use our new system (skip for real users)
          if (!isRealInstagramUser) {
            const bestAutomation = await DuplicateResponsePrevention.getBestMatchingAutomation(
              commentAutomations,
              commentText,
              automation.userId,
              automation.triggerType
            )
            
            // Only process if this is the best matching automation
            if (bestAutomation?.id !== automation.id) {
              console.log(`⏭️ [${requestId}] Skipping automation ${automation.id}, better match found: ${bestAutomation?.id}`)
              continue
            }
          } else {
            console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping best matching automation check for real Instagram user`)
          }
          
          // Check for database-level duplicates (skip for real users)
          if (!isRealInstagramUser) {
            const isDuplicateInDB = await DuplicateResponsePrevention.isDuplicateResponseInDatabase(
              automation.id,
              commenterId,
              rawText
            )
            
            if (isDuplicateInDB) {
              console.log(`🚫 [${requestId}] Duplicate response detected in database for automation ${automation.id}`)
              continue
            }
          } else {
            console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping database duplicate check for real Instagram user`)
          }
          
          // Create processing lock to prevent race conditions (skip for real users)
          let lockAcquired = true
          if (!isRealInstagramUser) {
            lockAcquired = await DuplicateResponsePrevention.createUniqueProcessingLock(
              `comment_${commentId}`,
              automation.id,
              commenterId
            )
            
            if (!lockAcquired) {
              console.log(`🔒 [${requestId}] Another process is handling this comment, skipping...`)
              continue
            }
          } else {
            console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping processing lock for real Instagram user`)
          }
          
          try {
            console.log(`🎯 [${requestId}] Processing automation ${automation.id} for commentId=${commentId} commenterId=${commenterId}`)
            
            // Handle Smart Follower Mode
            if (automation.dmMode === "smart_follower") {
              const trackedUser = await prisma.trackedUser.findUnique({
                where: {
                  userId_instagramUserId: {
                    userId: automation.userId,
                    instagramUserId: commenterId
                  }
                }
              })
              
              if (!trackedUser) {
                // First comment - track user but don't send DM
                await prisma.trackedUser.create({
                  data: {
                    userId: automation.userId,
                    instagramUserId: commenterId,
                    status: "first_commenter"
                  }
                })
                console.log(`👤 [${requestId}] Tracked new user ${commenterId} as first_commenter`)
                continue
              } else if (trackedUser.status === "first_commenter") {
                // Second comment - upgrade to trusted and send DM
                await prisma.trackedUser.update({
                  where: {
                    userId_instagramUserId: {
                      userId: automation.userId,
                      instagramUserId: commenterId
                    }
                  },
                  data: {
                    status: "trusted",
                    updatedAt: new Date()
                  }
                })
                console.log(`🎯 [${requestId}] Upgraded user ${commenterId} to trusted`)
              }
            }
            
            // Handle follow_comment trigger
            if (automation.triggerType === "follow_comment") {
              const isNewFollower = await followerTracker.isNewFollower(automation.userId, commenterId)
              if (!isNewFollower) continue
              
              await followerTracker.markFollowerCommented(automation.userId, commenterId)
              await logAutomationTrigger(automation.id, "follow_comment", rawText, commenterId, commenterUsername, true)
            } else {
              await logAutomationTrigger(automation.id, "comment", rawText, commenterId, commenterUsername, false)
            }
            
            await replyToInstagramComment(commentId, automation, commenterId, requestId)
            
            // ABSOLUTE FINAL FIX: Return immediately after processing ANY automation
            // This ensures NO OTHER AUTOMATIONS can process the same comment
            console.log(`✅ [${requestId}] Comment processed successfully by automation ${automation.id}, STOPPING ALL FURTHER PROCESSING`)
            return // Exit the entire function immediately
            
          } finally {
            // Release the processing lock only if it was acquired
            if (!isRealInstagramUser && lockAcquired) {
              await DuplicateResponsePrevention.releaseProcessingLock(
                `comment_${commentId}`,
                automation.id
              )
            }
          }
        } else {
          console.log(`❌ [${requestId}] No keyword match for automation ${automation.id}`)
        }
      }
      
      // If we get here without returning, no automation matched; log that explicitly
      console.log(`ℹ️ [${requestId}] No automation triggered for commentId=${commentId}. Reasons could be: account mismatch, missing scopes, keywords not matching, or post filter.`)
    } catch (error) {
      console.error(`💥 [${requestId}] Error handling Instagram comment:`, error)
      throw error
    }
  }
}

async function sendInstagramMessage(recipientId: string, automation: any, pageId: string, requestId: string) {
  console.log(`📩 [${requestId}] Sending DM to ${recipientId} with automation ${automation.id}`)
  
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: automation.userId,
        provider: "instagram",
      },
    })
    
    if (!account?.access_token) {
      throw new Error("No Instagram access token found")
    }
    
    // Get response message
    let responseMessage = ""
    if (automation.actionType === "ai" && automation.aiPrompt) {
      responseMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for reaching out!")
    } else if (automation.message) {
      responseMessage = automation.message
    } else {
      throw new Error("No message configured")
    }
    
    // Send DM with retry logic
    await sendDMWithRetry(account, recipientId, responseMessage, requestId)
    
    // Add to conversation history if AI automation
    if (automation.actionType === "ai") {
      await ConversationManager.addMessageToConversation(
        automation.userId,
        recipientId,
        automation.id,
        "assistant",
        responseMessage
      )
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Error sending Instagram DM:`, error)
    throw error
  }
}

async function sendInstagramAIMessage(recipientId: string, automation: any, pageId: string, userMessage: string, requestId: string) {
  console.log(`🤖 [${requestId}] Sending AI DM to ${recipientId}`)
  
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: automation.userId,
        provider: "instagram",
      },
    })
    
    if (!account?.access_token) {
      throw new Error("No Instagram access token found")
    }
    
    // Get conversation context
    const conversationContext = await ConversationManager.getConversationContext(
      automation.userId,
      recipientId,
      automation.id
    )
    
    // Generate AI response with context
    const responseMessage = await generateAIResponseWithContext(
      automation.aiPrompt,
      userMessage,
      conversationContext?.messages || [],
      automation.message || "Thanks for reaching out!"
    )
    
    // Send AI response with retry logic
    await sendDMWithRetry(account, recipientId, responseMessage, requestId)
    
    // Add to conversation history
    await ConversationManager.addMessageToConversation(
      automation.userId,
      recipientId,
      automation.id,
      "assistant",
      responseMessage
    )
    
  } catch (error) {
    console.error(`💥 [${requestId}] Error sending AI DM:`, error)
    throw error
  }
}

async function replyToInstagramComment(commentId: string, automation: any, commenterId: string, requestId: string) {
  console.log(`💭 [${requestId}] Replying to comment ${commentId}`)
  
  // REAL USER BYPASS: Allow real Instagram users to bypass duplicate prevention
  const isRealInstagramUser = commenterId && commenterId !== 'debug_user_123' && !commenterId.startsWith('test_') && commenterId.length > 10
  
  if (isRealInstagramUser) {
    console.log(`✅ [${requestId}] REAL USER BYPASS: Allowing real Instagram user ${commenterId} to bypass message duplicate prevention`)
  } else {
    // ULTRA DUPLICATE PREVENTION - Final check before sending (only for test users)
    if (!UltraDuplicatePrevention.canSendMessage(commentId, commenterId, automation.id)) {
      console.log(`🚫 [${requestId}] ULTRA FINAL BLOCK: Reply blocked by ultra duplicate prevention at send time`)
      return
    }
  }
  
  // CRITICAL FIX: Add duplicate prevention at the function level
  const processingLockId = `reply_${commentId}_${automation.id}_${commenterId}`;
  
  try {
    // Get response message first to check against global prevention
    let responseMessage = ""
    if (automation.actionType === "ai" && automation.aiPrompt) {
      responseMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for your comment!")
    } else if (automation.message) {
      responseMessage = automation.message
    } else {
      throw new Error("No DM message configured")
    }
    
    // GLOBAL DUPLICATE PREVENTION: Check if we can send this message (skip for real users)
    if (!isRealInstagramUser) {
      if (!GlobalDuplicatePrevention.canSendMessage(commentId, commenterId, automation.id, responseMessage)) {
        console.log(`🚫 [${requestId}] GLOBAL BLOCK: Message blocked by global duplicate prevention`)
        return;
      }
    } else {
      console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping global duplicate prevention for message sending`)
    }
    
    // Check if this exact reply has been processed recently in database (skip for real users)
    if (!isRealInstagramUser) {
      const recentReply = await prisma.automationLog.findFirst({
        where: {
          automationId: automation.id,
          userId: commenterId,
          triggerType: automation.triggerType,
          triggeredAt: {
            gte: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
          }
        }
      });
      
      if (recentReply) {
        console.log(`🚫 [${requestId}] DB BLOCK: Reply already sent recently at ${recentReply.triggeredAt}, skipping duplicate`);
        return;
      }
    } else {
      console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping database duplicate check for message sending`)
    }
    
    const account = await prisma.account.findFirst({
      where: {
        userId: automation.userId,
        provider: "instagram",
      },
    })
    
    if (!account?.access_token) {
      throw new Error("No Instagram access token found")
    }
    
    // FIXED LOGIC: Only send private DM, not both comment reply and DM
    // Based on Instagram's Private Reply feature, we use the comment_id as recipient
    
    // Response message already determined above - use it directly
    
    // Prefer Instagram Private Reply API. If it fails, fallback to regular DM endpoint.
    
    // NUCLEAR PREVENTION: Absolute final check before ANY message is sent (skip for real users)
    if (!isRealInstagramUser) {
      if (!NuclearDuplicatePrevention.canSendMessage(commenterId, commentId, `automation_${automation.id}`)) {
        console.log(`🚫 NUCLEAR ABORT: Message sending ABORTED by nuclear duplicate prevention`)
        return // Exit immediately - do not send message
      }
    } else {
      console.log(`✅ [${requestId}] REAL USER BYPASS: Skipping nuclear duplicate prevention for message sending`)
    }
    
    // Use Instagram's Private Reply feature for comments instead of regular DMs
    // This is specifically designed for responding to comments privately and has different permissions
    console.log(`📩 [${requestId}] Sending private reply to comment ${commentId} from user ${commenterId}`)
    
    // Try Instagram's Private Reply API first (comment-specific)
    // Use appropriate endpoint based on token type
    let apiEndpoint;
    if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
      console.log(`🔄 [${requestId}] Using Instagram Graph API for Basic Display token`)
      apiEndpoint = `https://graph.instagram.com/v18.0/${commentId}/private_replies`;
    } else {
      console.log(`🔄 [${requestId}] Using Facebook Graph API for Business token`)
      apiEndpoint = `https://graph.facebook.com/v18.0/${commentId}/private_replies`;
    }
    
    let dmResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.access_token}`,
      },
      body: JSON.stringify({
        message: responseMessage
      }),
    })
    
    // If private reply fails, try regular messaging as fallback
    if (!dmResponse.ok) {
      console.log(`⚠️ [${requestId}] Private reply failed, trying regular DM as fallback`)
      
      // Use appropriate endpoint for DM based on token type
      let dmEndpoint;
      if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
        console.log(`🔄 [${requestId}] Using Instagram Graph API for DM fallback`)
        dmEndpoint = `https://graph.instagram.com/v18.0/me/messages`;
      } else {
        console.log(`🔄 [${requestId}] Using Facebook Graph API for DM fallback`)
        dmEndpoint = `https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`;
      }
      
      dmResponse = await fetch(dmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          recipient: { 
            id: commenterId  // Use the actual Instagram user ID instead of comment_id
          },
          message: { 
            text: responseMessage 
          }
        }),
      })
    }
    
    if (!dmResponse.ok) {
      const errorText = await dmResponse.text()
      console.error(`❌ [${requestId}] Private reply failed:`, errorText)
      
      // Check if it's a messaging window restriction
      if (errorText.includes("outside of allowed window") || errorText.includes("2534022")) {
        console.log(`⏰ [${requestId}] DM failed due to messaging window restriction - falling back to comment reply immediately`)
      }
      
      // Final fallback: Try public comment reply if both private methods fail
      console.log(`💬 [${requestId}] Trying public comment reply as final fallback`)
      try {
        await replyToCommentWithRetry(account, commentId, responseMessage, requestId)
        console.log(`✅ [${requestId}] Public comment reply sent successfully as fallback`)
        return // Success with public reply, exit function
      } catch (commentError) {
        console.error(`💥 [${requestId}] All reply methods failed:`, commentError)
        throw new Error(`All reply methods failed. Private reply: ${errorText}`)
      }
    }
    
    console.log(`✅ [${requestId}] Private reply/DM sent successfully to user ${commenterId}`)
    
    // Log what type of message was sent
    const responseData = await dmResponse.json()
    console.log(`📋 [${requestId}] Message details:`, responseData)
    
    // MARK MESSAGE AS SENT in NUCLEAR prevention system (ABSOLUTE MOST AGGRESSIVE)
    NuclearDuplicatePrevention.markMessageSent(commentId, commenterId, automation.id)
    console.log(`☢️ [${requestId}] Message marked in NUCLEAR duplicate prevention system (1-minute ABSOLUTE cooldown)`)
    
    // MARK MESSAGE AS SENT in ULTRA prevention system (most aggressive)
    UltraDuplicatePrevention.markMessageSent(commentId, commenterId, automation.id)
    console.log(`🔒 [${requestId}] Message marked in ULTRA duplicate prevention system (1-minute cooldown)`)
    
    // MARK MESSAGE AS SENT in global prevention system (backup)
    GlobalDuplicatePrevention.markMessageSent(commentId, commenterId, automation.id, responseMessage)
    console.log(`🔒 [${requestId}] Message marked in global duplicate prevention system`)
    
    // Optional: Send public comment reply if configured (in addition to private reply/DM)
    if (automation.commentReply && automation.commentReply.trim() !== "") {
      try {
        console.log(`💬 [${requestId}] Sending public comment reply to ${commentId}`)
        await replyToCommentWithRetry(account, commentId, automation.commentReply, requestId)
        console.log(`✅ [${requestId}] Public comment reply sent successfully`)
      } catch (replyError) {
        console.error(`❌ [${requestId}] Failed to send public comment reply:`, replyError)
      }
    } else {
      console.log(`💬 [${requestId}] No public comment reply configured (DM-only automation)`) 
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Error replying to comment:`, error)
    throw error
  }
}

async function sendDMWithRetry(account: any, recipientId: string, message: string, requestId: string, maxRetries = 3) {
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          messaging_type: "RESPONSE"
        }),
      })
      
      if (response.ok) {
        console.log(`✅ [${requestId}] DM sent successfully on attempt ${attempts + 1}`)
        return
      }
      
      const errorText = await response.text()
      console.error(`❌ [${requestId}] DM failed (attempt ${attempts + 1}):`, errorText)
      
      attempts++
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
    } catch (error) {
      attempts++
      console.error(`💥 [${requestId}] DM error (attempt ${attempts}):`, error)
      
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error(`Failed to send DM after ${maxRetries} attempts`)
}

async function replyToCommentWithRetry(account: any, commentId: string, message: string, requestId: string, maxRetries = 3) {
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      // Use appropriate API endpoint based on token type
      let apiEndpoint;
      if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
        console.log(`🔄 [${requestId}] Using Instagram Graph API for comment reply`)
        apiEndpoint = `https://graph.instagram.com/v18.0/${commentId}/replies`;
      } else {
        console.log(`🔄 [${requestId}] Using Facebook Graph API for comment reply`)
        apiEndpoint = `https://graph.facebook.com/v18.0/${commentId}/replies`;
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          message: message,
        }),
      })
      
      if (response.ok) {
        console.log(`✅ [${requestId}] Comment reply sent successfully on attempt ${attempts + 1}`)
        return
      }
      
      const errorText = await response.text()
      console.error(`❌ [${requestId}] Comment reply failed (attempt ${attempts + 1}):`, errorText)
      
      attempts++
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
    } catch (error) {
      attempts++
      console.error(`💥 [${requestId}] Comment reply error (attempt ${attempts}):`, error)
      
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error(`Failed to reply to comment after ${maxRetries} attempts`)
}

async function sendPrivateReplyToComment(commentId: string, automation: any, commenterId: string, requestId: string) {
  console.log(`📩 [${requestId}] Sending private reply for comment ${commentId}`)
  
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: automation.userId,
        provider: "instagram",
      },
    })
    
    if (!account?.access_token) {
      throw new Error("No Instagram access token found")
    }

    // Get response message for private DM
    let responseMessage = ""
    if (automation.actionType === "ai" && automation.aiPrompt) {
      responseMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for your comment!")
    } else if (automation.message) {
      responseMessage = automation.message
    } else {
      throw new Error("No DM message configured")
    }

    // Send private reply - try both Instagram and Facebook endpoints
    let dmResponse;
    
    // First try Instagram Graph API (for Basic Display tokens)
    if (account.access_token.startsWith('IGAAR') || account.access_token.startsWith('IGQVJ')) {
      console.log(`🔄 [${requestId}] Using Instagram Graph API for Basic Display token`)
      dmResponse = await fetch(`https://graph.instagram.com/v18.0/me/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          recipient: { 
            comment_id: commentId 
          },
          message: { 
            text: responseMessage 
          }
        }),
      })
    } else {
      // Use Facebook Graph API for Business tokens
      console.log(`🔄 [${requestId}] Using Facebook Graph API for Business token`)
      dmResponse = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          recipient: { 
            comment_id: commentId 
          },
          message: { 
            text: responseMessage 
          }
        }),
      })
    }

    if (dmResponse.ok) {
      console.log(`✅ [${requestId}] Private reply sent successfully`)
    } else {
      const errorText = await dmResponse.text()
      console.error(`❌ [${requestId}] Private reply failed:`, errorText)
      throw new Error(`Private reply failed: ${errorText}`)
    }
    
    // Get private message
    let privateMessage = ""
    if (automation.actionType === "ai" && automation.aiPrompt) {
      privateMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for your comment!")
    } else if (automation.message) {
      privateMessage = automation.message
    } else {
      throw new Error("No message configured")
    }
    
    // Send private reply
    const response = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.access_token}`,
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: privateMessage },
      }),
    })
    
    if (response.ok) {
      console.log(`✅ [${requestId}] Private reply sent successfully`)
    } else {
      const errorText = await response.text()
      console.error(`❌ [${requestId}] Private reply failed:`, errorText)
    }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Error sending private reply:`, error)
  }
}

async function generateAIResponse(aiPrompt: string, fallbackMessage: string): Promise<string> {
  try {
    const { getAzureOpenAI } = await import("@/lib/azure-openai")
    const openai = getAzureOpenAI()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${aiPrompt}\n\nCRITICAL: Keep responses under 800 characters. Be concise, direct, and helpful.`
        },
        {
          role: "user",
          content: "Generate a helpful response."
        }
      ],
      max_tokens: 120,
      temperature: 0.7,
    })
    
    let aiResponse = completion.choices[0]?.message?.content || fallbackMessage
    
    // Ensure response is under Instagram's character limit
    if (aiResponse.length > 800) {
      aiResponse = aiResponse.substring(0, 797) + "..."
    }
    
    return aiResponse
    
  } catch (error) {
    console.error("Error generating AI response:", error)
    return fallbackMessage
  }
}

async function generateAIResponseWithContext(
  aiPrompt: string, 
  userMessage: string, 
  conversationHistory: any[], 
  fallbackMessage: string
): Promise<string> {
  try {
    const { getAzureOpenAI } = await import("@/lib/azure-openai")
    const openai = getAzureOpenAI()
    
    const messages: any[] = [
      {
        role: "system",
        content: `${aiPrompt}\n\nCRITICAL: Keep responses under 800 characters. Be concise, direct, and helpful.`
      }
    ]
    
    // Add recent conversation history
    const recentHistory = conversationHistory.slice(-10)
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    })
    
    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    })
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 120,
      temperature: 0.7,
    })
    
    let aiResponse = completion.choices[0]?.message?.content || fallbackMessage
    
    // Ensure response is under Instagram's character limit
    if (aiResponse.length > 800) {
      aiResponse = aiResponse.substring(0, 797) + "..."
    }
    
    return aiResponse
    
  } catch (error) {
    console.error("Error generating AI response with context:", error)
    return fallbackMessage
  }
}

async function logAutomationTrigger(
  automationId: string,
  triggerType: string,
  triggerText: string,
  userId: string,
  username?: string,
  isNewFollower?: boolean
) {
  try {
    await prisma.automationLog.create({
      data: {
        automationId,
        triggerType,
        triggerText,
        userId: userId,
        username: username,
        isNewFollower: isNewFollower || false,
        triggeredAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error logging automation trigger:", error)
  }
} 