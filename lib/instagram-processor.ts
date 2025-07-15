import { prisma } from "@/lib/db"
import { followerTracker } from "@/lib/follower-tracker"
import { ConversationManager } from "@/lib/conversation-manager"
import { Redis } from '@upstash/redis'

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
  
  console.log(`🔄 [${requestId}] Starting event processing...`)
  
  try {
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
              await handleInstagramComment(change.value, requestId, instagramAccountId)
            }
          }
        }
      }
    }
    
    console.log(`✅ [${requestId}] Event processing completed successfully`)
    return { success: true, requestId }
    
  } catch (error) {
    console.error(`💥 [${requestId}] Event processing failed:`, error)
    throw error
  }
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

async function handleInstagramComment(commentData: any, requestId: string, instagramAccountId: string) {
  console.log(`💭 [${requestId}] Processing Instagram comment:`, commentData)
  
  if (commentData.text) {
    const commentText = commentData.text.toLowerCase()
    const commentId = commentData.id
    const commenterId = commentData.from?.id
    const commenterUsername = commentData.from?.username
    const postId = commentData.media?.id
    const parentId = commentData.parent_id
    
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
        
        // Check if business account
        const isBusinessAccount = userInstagramAccount.scope?.includes("instagram_manage_messages") || 
                                  userInstagramAccount.scope?.includes("instagram_manage_comments")
        
        if (!isBusinessAccount) {
          console.log(`❌ [${requestId}] Instagram account ${userInstagramAccount.providerAccountId} doesn't have business permissions`)
          continue
        }
        
        // CRITICAL FIX: Check if this Instagram account is the one receiving the webhook event
        if (userInstagramAccount.providerAccountId !== instagramAccountId) {
          console.log(`❌ [${requestId}] Instagram account mismatch: automation owner has ${userInstagramAccount.providerAccountId}, webhook is for ${instagramAccountId}`)
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
        
        if (postsToCheck.length > 0 && !postsToCheck.includes(postId)) {
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
          console.log(`🎯 [${requestId}] Keyword match found! Triggering automation ${automation.id}`)
          
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
            await logAutomationTrigger(automation.id, "follow_comment", commentData.text, commenterId, commenterUsername, true)
          } else {
            await logAutomationTrigger(automation.id, "comment", commentData.text, commenterId, commenterUsername, false)
          }
          
          console.log(`🎯 [${requestId}] Triggering automation ${automation.id} for comment`)
          await replyToInstagramComment(commentId, automation, commenterId, requestId)
          break
        } else {
          console.log(`❌ [${requestId}] No keyword match for automation ${automation.id}`)
        }
      }
      
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
    
    // Get comment reply message
    let commentReplyMessage = ""
    if (automation.actionType === "ai" && automation.aiPrompt) {
      commentReplyMessage = await generateAIResponse(automation.aiPrompt, automation.commentReply || "Thanks for your comment!")
    } else if (automation.commentReply) {
      commentReplyMessage = automation.commentReply
    } else if (automation.message) {
      commentReplyMessage = automation.message
    } else {
      throw new Error("No response message configured")
    }
    
    // Reply to comment with retry logic
    await replyToCommentWithRetry(account, commentId, commentReplyMessage, requestId)
    
    // Send private DM if configured
    if (automation.message && automation.message.trim() !== "") {
      await sendPrivateReplyToComment(commentId, automation, commenterId, requestId)
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
      const response = await fetch(`https://graph.instagram.com/v18.0/${account.providerAccountId}/messages`, {
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
      const response = await fetch(`https://graph.instagram.com/v18.0/${commentId}/replies`, {
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
    const response = await fetch(`https://graph.instagram.com/v18.0/${account.providerAccountId}/messages`, {
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