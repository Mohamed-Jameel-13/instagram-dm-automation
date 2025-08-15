import { prisma } from "@/lib/db"
import { DuplicateResponsePrevention } from "@/lib/duplicate-prevention"
import { UltraDuplicatePrevention } from "@/lib/ultra-duplicate-prevention"
import { GlobalDuplicatePrevention } from "@/lib/global-duplicate-prevention"
import { ConversationManager } from "@/lib/conversation-manager"
import { generateAIResponse } from "@/lib/azure-openai"
import { InstagramAPI } from "@/lib/instagram-api"

// OPTIMIZATION: Cache for automation rules (60 second TTL)
const CACHE_TTL = 60 * 1000; // 60 seconds
const automationCache = new Map<string, { data: any[], timestamp: number }>();
const accountCache = new Map<string, { data: any[], timestamp: number }>();

// Helper: robust keyword parser that accepts CSV or JSON array strings
function parseKeywords(keywordField: any): string[] {
  if (!keywordField) return [];
  if (Array.isArray(keywordField)) {
    return keywordField
      .map((k: any) => String(k).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof keywordField === 'string') {
    const raw = keywordField.trim();
    // Try JSON array first: ["hi","hello"]
    if ((raw.startsWith('[') && raw.endsWith(']')) || raw.includes('\"')) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr.map((k: any) => String(k).trim().toLowerCase()).filter(Boolean);
        }
      } catch (_) {
        // fall through to CSV parsing
      }
    }
    // CSV fallback: hi, hello | support newlines
    return raw
      .split(/[\n,]/)
      .map(s => s.replace(/^[\s\[\"]+|[\s\]\"]+$/g, ''))
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [String(keywordField).trim().toLowerCase()];
}

// OPTIMIZATION: Cached automation rules lookup
export async function getAutomationRules(userId?: string, active = true) {
  const cacheKey = `${userId || 'all'}_${active}`;
  const cached = automationCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const whereCondition: any = {};
    if (userId) whereCondition.userId = userId;
    if (active) whereCondition.active = true;

    const automations = await prisma.automation.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        active: true,
        triggerType: true,
        keywords: true,
        actionType: true,
        message: true,
        commentReply: true,
        aiPrompt: true,
        posts: true,
        dmMode: true,
        userId: true
      }
    });

    // Update cache
    automationCache.set(cacheKey, { data: automations, timestamp: Date.now() });
    
    return automations;
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    // Return cached data if available, even if expired
    if (cached) return cached.data;
    return [];
  }
}

// OPTIMIZATION: Cached account lookup
async function getAccounts() {
  const cacheKey = 'instagram_accounts';
  const cached = accountCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const accounts = await prisma.account.findMany({
      where: { provider: "instagram" },
      select: {
        id: true,
        userId: true,
        providerAccountId: true,
        access_token: true,
        scope: true
      }
    });
    
    accountCache.set(cacheKey, { data: accounts, timestamp: Date.now() });
    return accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    if (cached) return cached.data;
    return [];
  }
}

// OPTIMIZATION: Batch database operations
async function batchDatabaseOperations(operations: Promise<any>[]) {
  try {
    return await Promise.allSettled(operations);
  } catch (error) {
    console.error("Batch operation failed:", error);
    return [];
  }
}

// OPTIMIZATION: Main event processor with parallel processing
export async function processInstagramEvent(eventData: any) {
  const { requestId, body } = eventData;
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] Starting OPTIMIZED event processing...`);
  
  return await DuplicateResponsePrevention.processWithDuplicatePrevention(
    body,
    async () => {
      if (body.object === "instagram") {
        // OPTIMIZATION: Process all entries in parallel
        const entryPromises = body.entry.map(async (entry: any) => {
          const instagramAccountId = entry.id;
          const promises: Promise<any>[] = [];
          
          // Handle Direct Messages
          if (entry.messaging) {
            entry.messaging.forEach((event: any) => {
              promises.push(handleInstagramMessage(event, requestId, instagramAccountId));
            });
          }
          
          // Handle Comments
          if (entry.changes) {
            entry.changes.forEach((change: any) => {
              if (change.field === "comments") {
                const value = change.value;
                const hasText = !!(value?.text || value?.message);
                if (hasText) {
                  promises.push(handleInstagramComment(value, requestId, instagramAccountId));
                }
              }
            });
          }
          
          return Promise.allSettled(promises);
        });
        
        await Promise.all(entryPromises);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] OPTIMIZED processing completed in ${processingTime}ms`);
      return { success: true, requestId, processingTime };
    }
  );
}

// OPTIMIZATION: Optimized comment handler with reduced database calls
export async function handleInstagramComment(commentData: any, requestId: string, instagramAccountId: string) {
  const startTime = Date.now();
  
  if (!commentData || (!commentData.text && !commentData.message)) {
    return;
  }

  const rawText = commentData.text || commentData.message;
  const commentText = String(rawText).toLowerCase();
  const commentId = commentData.id || commentData.comment_id;
  const commenterId = commentData.from?.id;
  const commenterUsername = commentData.from?.username;
  const postId = commentData.media?.id || commentData.media_id;
  
  const isRealInstagramUser = commenterId && 
    commenterId !== 'debug_user_123' && 
    !commenterId.startsWith('test_') && 
    commenterId.length > 10;

  // OPTIMIZATION: Skip duplicate prevention for real users entirely
  if (!isRealInstagramUser) {
    if (!UltraDuplicatePrevention.canSendMessage(commentId, commenterId, 'any')) {
      console.log(`🚫 [${requestId}] ULTRA BLOCKED: Comment processing blocked`);
      return;
    }
    
    // OPTIMIZATION: Single database query for recent logs instead of multiple checks
    const recentLog = await prisma.automationLog.findFirst({
      where: {
        userId: commenterId,
        triggerText: rawText,
        triggeredAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
      },
      select: { id: true }, // Only select ID for faster query
      orderBy: { triggeredAt: 'desc' }
    });
    
    if (recentLog) {
      console.log(`🚫 [${requestId}] DB BLOCK: Comment already processed recently`);
      return;
    }
  }

  try {
    // OPTIMIZATION: Get cached data in parallel
    const [automations, accountsData] = await Promise.all([
      getAutomationRules(undefined, true),
      getAccounts()
    ]);
    
    // Limit automations to the Instagram account that fired this webhook.
    // If we don't find a matching account id (IG user id vs business id mismatch),
    // fall back to all users' automations to avoid false negatives.
    const matchingAccounts = accountsData.filter(acc => acc.providerAccountId === instagramAccountId);
    const hasMatchingAccount = matchingAccounts.length > 0;
    const allowedUserIds = new Set(matchingAccounts.map(acc => acc.userId));

    const baseAutomations = automations.filter(a => (
      a.triggerType === "comment" || a.triggerType === "follow_comment"
    ));

    const commentAutomations = hasMatchingAccount
      ? baseAutomations.filter(a => allowedUserIds.has(a.userId))
      : baseAutomations;

    if (!hasMatchingAccount) {
      console.log(`ℹ️ [${requestId}] No account matched instagramAccountId=${instagramAccountId}. Using fallback (all users).`);
    }
    
    if (commentAutomations.length === 0) {
      console.log(`ℹ️ [${requestId}] No active comment automations found`);
      return;
    }
    
    // OPTIMIZATION: Create lookup maps for O(1) access
    const accountMap = new Map();
    accountsData.forEach(acc => accountMap.set(acc.userId, acc));
    
    // OPTIMIZATION: Process automations in parallel
    const automationPromises = commentAutomations.map(async (automation) => {
      const userInstagramAccount = accountMap.get(automation.userId);
      
      if (!userInstagramAccount) {
        return { success: false, reason: 'No Instagram account' };
      }
      
      // CRITICAL: Ensure this automation belongs to the IG account that fired the webhook
      // This prevents using tokens from unrelated (e.g., test) accounts
      const isAccountMatch = userInstagramAccount.providerAccountId === instagramAccountId;
      if (hasMatchingAccount && !isAccountMatch) {
        console.log(`ℹ️ [${requestId}] Skipping automation ${automation.id} due to account mismatch`);
        return { success: false, reason: 'Account mismatch' };
      }
      
      // Robust keyword parsing: supports CSV and JSON array strings
      const keywords = parseKeywords(automation.keywords);
      const hasMatchingKeyword = keywords.length === 0
        ? false
        : keywords.some(keyword => commentText.includes(keyword));
      
      if (!hasMatchingKeyword) {
        console.log(`ℹ️ [${requestId}] Skipping automation ${automation.id} - no keyword match for "${commentText}"`);
        return { success: false, reason: 'No keyword match' };
      }
      
      // OPTIMIZATION: Process automation without waiting for others
      try {
        const processStartTime = Date.now();
        
        if (automation.actionType === 'dm' || automation.message) {
          await sendInstagramMessage(commenterId, automation, instagramAccountId, requestId, userInstagramAccount, postId);
          
          // OPTIMIZATION: Send comment reply in parallel if needed
          if (automation.commentReply && automation.commentReply.trim() !== "") {
            // Don't await - let it run in background
            replyToCommentWithRetry(userInstagramAccount, commentId, automation.commentReply, requestId)
              .catch(error => console.error(`Comment reply error: ${error.message}`));
          }
        } else {
          await replyToInstagramComment(commentId, automation, commenterId, requestId, postId);
        }
        
        const processingTime = Date.now() - processStartTime;
        
        // OPTIMIZATION: Log automation trigger asynchronously
        logAutomationTrigger(automation.id, "comment", rawText, commenterId, processingTime)
          .catch(error => console.error(`Logging error: ${error.message}`));
        
        return { success: true, processingTime };
        
      } catch (error) {
        console.error(`Automation ${automation.id} failed:`, error);
        return { success: false, error: error.message };
      }
    });
    
    // Wait for all automations to complete
    const results = await Promise.allSettled(automationPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Processed ${successful}/${commentAutomations.length} automations in ${totalTime}ms`);
    
  } catch (error) {
    console.error(`💥 [${requestId}] Comment processing error:`, error);
    throw error;
  }
}

// OPTIMIZATION: Optimized message sending with reduced latency
async function sendInstagramMessage(
  recipientId: string, 
  automation: any, 
  pageId: string, 
  requestId: string, 
  account?: any,
  triggerSource?: string
) {
  const startTime = Date.now();
  
  try {
    if (!account?.access_token) {
      throw new Error("No Instagram access token found");
    }
    
    let responseMessage = "";
    
    // OPTIMIZATION: Parallel AI generation and DM preparation
    if (automation.actionType === "ai" && automation.aiPrompt) {
      // Generate AI response
      responseMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for reaching out!");
    } else if (automation.message) {
      responseMessage = automation.message;
    } else {
      throw new Error("No message configured");
    }
    
    // Choose the best token/id for messaging (prefer a Facebook Page token if available)
    let tokenAccount = account as any;
    let messagesId = account.providerAccountId || pageId;

    const tokenLooksInvalid = !tokenAccount.access_token || String(tokenAccount.access_token).length < 60;
    const scopeStr = (tokenAccount.scope || '').toLowerCase();
    const missingMessagingScope = scopeStr && !scopeStr.includes('pages_messaging') && !scopeStr.includes('instagram_manage_messages');

    if (tokenLooksInvalid || missingMessagingScope) {
      try {
        const fbAccount = await prisma.account.findFirst({
          where: { userId: automation.userId, provider: 'facebook' },
          select: { access_token: true, providerAccountId: true, scope: true }
        });
        if (fbAccount?.access_token) {
          tokenAccount = fbAccount;
          messagesId = fbAccount.providerAccountId || messagesId;
          console.log(`ℹ️ [${requestId}] Using Facebook page token fallback for messaging`);
        }
      } catch (_) {
        // ignore fallback errors; we will attempt with original token
      }
    }

    // OPTIMIZATION: Send DM and handle conversation in parallel
    const tasks: Promise<any>[] = [
      sendDMWithRetry(tokenAccount, recipientId, responseMessage, requestId, 2, messagesId)
    ];
    
    if (automation.actionType === "ai") {
      tasks.push(
        ConversationManager.addMessageToConversation(
          automation.userId,
          recipientId,
          automation.id,
          "assistant",
          responseMessage
        )
      );
    }
    
    await Promise.all(tasks);
    
    const responseTime = Date.now() - startTime;
    console.log(`📤 [${requestId}] DM sent in ${responseTime}ms`);
    
    // OPTIMIZATION: Log analytics asynchronously
    const isAiGenerated = automation.actionType === "ai" && automation.aiPrompt;
    logDMAnalytics(automation, recipientId, triggerSource, responseTime, isAiGenerated)
      .catch(error => console.error(`Analytics logging error: ${error.message}`));
    
  } catch (error) {
    console.error(`💥 [${requestId}] Send message error:`, error);
    throw error;
  }
}

// OPTIMIZATION: Faster DM sending with optimized retry logic
async function sendDMWithRetry(account: any, recipientId: string, message: string, requestId: string, maxRetries = 2, messagesIdOverride?: string) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const rawToken = String(account.access_token || '').trim();
      if (!rawToken) throw new Error('Missing access token');

      // Sanitize common formatting issues without altering valid chars
      const token = rawToken
        .replace(/[\r\n\t\f\v\s]+/g, '') // remove all whitespace/newlines
        .replace(/^["'`]+|["'`]+$/g, '');   // strip surrounding quotes/backticks
      const idForMessages = messagesIdOverride || account.providerAccountId;
      const apiEndpoint = `https://graph.facebook.com/v18.0/${idForMessages}/messages`;

      const requestBody = {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: 'RESPONSE'
      } as any;

      // 1) Primary FB Graph endpoint (Bearer token)
      const fbResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (fbResponse.ok) {
        console.log(`✅ [${requestId}] DM sent successfully (FB Graph)`);
        return;
      }

      const errorText = await fbResponse.text();
      console.error(`❌ [${requestId}] DM failed (attempt ${attempts + 1}):`, errorText);

      // 2) If OAuth error, try Instagram Graph me/messages with token as query
      if (attempts === 0 && (errorText.includes('Invalid OAuth') || errorText.includes('access token'))) {
        try {
          const igApiEndpoint = `https://graph.instagram.com/v18.0/me/messages?access_token=${encodeURIComponent(token)}`;
          const igResponse = await fetch(igApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          if (igResponse.ok) {
            console.log(`✅ [${requestId}] DM sent successfully (IG Graph me/messages)`);
            return;
          }

          // 3) Try form-encoded variant which some tokens require
          const formBody = new URLSearchParams();
          formBody.set('recipient', JSON.stringify({ id: recipientId }));
          formBody.set('message', JSON.stringify({ text: message }));
          formBody.set('messaging_type', 'RESPONSE');

          const formResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${token}`
            },
            body: formBody as any,
          });

          if (formResponse.ok) {
            console.log(`✅ [${requestId}] DM sent successfully (form-encoded)`);
            return;
          }
        } catch (fallbackErr) {
          console.error(`⚠️ [${requestId}] Fallback attempts failed:`, fallbackErr);
        }
      }

      attempts++;
      if (attempts < maxRetries) {
        const delay = 500 + attempts * 200;
        await new Promise(res => setTimeout(res, delay));
      }

    } catch (err) {
      attempts++;
      console.error(`💥 [${requestId}] DM error (attempt ${attempts}):`, err);
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 500;
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  throw new Error(`Failed to send DM after ${maxRetries} attempts`);
}

// OPTIMIZATION: Asynchronous logging functions
async function logAutomationTrigger(automationId: string, triggerType: string, triggerText: string, userId: string, processingTime?: number) {
  // Run in background without blocking main flow
  setImmediate(async () => {
    try {
      await prisma.automationLog.create({
        data: {
          automationId,
          triggerType,
          triggerText,
          userId,
          processingTimeMs: processingTime
        }
      });
    } catch (error) {
      console.error('Background logging error:', error);
    }
  });
}

async function logDMAnalytics(automation: any, recipientId: string, triggerSource?: string, responseTime?: number, isAiGenerated?: boolean) {
  // Run in background
  setImmediate(async () => {
    try {
      await prisma.dmAnalytics.create({
        data: {
          automationId: automation.id,
          userId: automation.userId,
          recipientId,
          triggerType: isAiGenerated ? 'ai_dm' : 'dm',
          triggerSource,
          messageLength: automation.message?.length || 0,
          responseTimeMs: responseTime || 0,
          status: 'sent'
        }
      });
    } catch (error) {
      console.error('Background analytics error:', error);
    }
  });
}

// OPTIMIZATION: Optimized comment reply with faster processing
async function replyToCommentWithRetry(account: any, commentId: string, message: string, requestId: string, maxRetries = 2) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const token = account.access_token.trim().replace(/\s+/g, '').replace(/["'`]/g, '');
      
      const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ [${requestId}] Comment reply sent`);
        return;
      }
      
      attempts++;
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200 * attempts));
      }
      
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempts));
      }
    }
  }
  
  console.error(`❌ [${requestId}] Comment reply failed after ${maxRetries} attempts`);
}

// OPTIMIZATION: Optimized DM handler (simplified version of comment handler)
async function handleInstagramMessage(event: any, requestId: string, instagramAccountId: string) {
  if (event.message && event.message.text && !event.message.is_echo) {
    const messageText = event.message.text.toLowerCase();
    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    
    try {
      const [automations, accountsData] = await Promise.all([
        getAutomationRules(undefined, true),
        getAccounts()
      ]);
      
      const dmAutomations = automations.filter(a => a.triggerType === "dm");
      
      if (dmAutomations.length === 0) return;
      
      const accountMap = new Map();
      accountsData.forEach(acc => accountMap.set(acc.userId, acc));
      
      // Process first matching automation only for speed
      for (const automation of dmAutomations) {
        const userInstagramAccount = accountMap.get(automation.userId);
        if (!userInstagramAccount) continue;
        
        const keywords = parseKeywords(automation.keywords);
        const hasMatchingKeyword = keywords.length === 0
          ? false
          : keywords.some(keyword => messageText.includes(keyword));
        
        if (hasMatchingKeyword) {
          if (automation.actionType === "ai") {
            ConversationManager.startConversation(automation.userId, senderId, automation.id, messageText)
              .catch(error => console.error('Conversation start error:', error));
          }
          
          await sendInstagramMessage(senderId, automation, recipientId, requestId, userInstagramAccount);
          
          logAutomationTrigger(automation.id, "dm", messageText, senderId)
            .catch(error => console.error('DM logging error:', error));
          break;
        }
      }
      
    } catch (error) {
      console.error(`💥 [${requestId}] DM handling error:`, error);
    }
  }
}

// OPTIMIZATION: Simplified comment reply function
async function replyToInstagramComment(commentId: string, automation: any, commenterId: string, requestId: string, postId?: string) {
  const isRealInstagramUser = commenterId && commenterId !== 'debug_user_123' && !commenterId.startsWith('test_') && commenterId.length > 10;
  
  if (!isRealInstagramUser) {
    if (!UltraDuplicatePrevention.canSendMessage(commentId, commenterId, automation.id)) {
      return;
    }
    
    if (!GlobalDuplicatePrevention.canSendMessage(commentId, commenterId, automation.id, automation.message)) {
      return;
    }
  }
  
  try {
    const account = await prisma.account.findFirst({
      where: { userId: automation.userId, provider: "instagram" },
      select: { access_token: true, providerAccountId: true }
    });
    
    if (!account?.access_token) {
      throw new Error("No Instagram access token found");
    }
    
    let responseMessage = "";
    if (automation.actionType === "ai" && automation.aiPrompt) {
      responseMessage = await generateAIResponse(automation.aiPrompt, automation.message || "Thanks for your comment!");
    } else {
      responseMessage = automation.message;
    }
    
    await replyToCommentWithRetry(account, commentId, responseMessage, requestId);
    
    // Log asynchronously
    logAutomationTrigger(automation.id, automation.triggerType, responseMessage, commenterId)
      .catch(error => console.error('Comment reply logging error:', error));
    
  } catch (error) {
    console.error(`💥 [${requestId}] Comment reply error:`, error);
    throw error;
  }
}

// Cache invalidation functions
export function invalidateAutomationCache() {
  automationCache.clear();
  console.log('🗑️ Automation cache cleared');
}

export function invalidateAccountCache() {
  accountCache.clear();
  console.log('🗑️ Account cache cleared');
}

// Health check function
export function getCacheStats() {
  return {
    automationCache: {
      size: automationCache.size,
      entries: Array.from(automationCache.keys())
    },
    accountCache: {
      size: accountCache.size,
      entries: Array.from(accountCache.keys())
    }
  };
}
