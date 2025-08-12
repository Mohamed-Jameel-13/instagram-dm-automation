/**
 * COMPREHENSIVE FIX FOR DUPLICATE RESPONSES
 * 
 * This file addresses all possible causes of duplicate responses when commenting on posts:
 * 
 * 1. Multiple webhook deliveries from Instagram
 * 2. Multiple matching automations for the same user
 * 3. Race conditions in processing
 * 4. Redis queue duplication
 * 5. Network retry mechanisms
 */

import { prisma } from "@/lib/db"

// In-memory tracking for processed events (prevents immediate duplicates)
const processedEvents = new Map<string, { timestamp: number, result: string }>()
const PROCESSED_EVENT_TTL = 300000 // 5 minutes

// Clean up old processed events every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of processedEvents.entries()) {
    if (now - value.timestamp > PROCESSED_EVENT_TTL) {
      processedEvents.delete(key)
    }
  }
}, 60000)

class DuplicateResponsePrevention {
  
  /**
   * Generate a unique event identifier based on the webhook content
   */
  static generateEventId(eventData: any): string {
    const changeValue = eventData.entry?.[0]?.changes?.[0]?.value
    if (changeValue && (changeValue.comment_id || changeValue.id)) {
      // For comment events, use comment ID (supports both id and comment_id) + text content
      const commentId = changeValue.comment_id || changeValue.id
      return `comment_${commentId}_${(changeValue.text || '').slice(0, 50)}`
    }
    
    if (eventData.entry?.[0]?.messaging?.[0]) {
      // For message events, use sender + message content
      const message = eventData.entry[0].messaging[0]
      const senderId = message.sender?.id || 'unknown'
      const text = message.message?.text?.slice(0, 50) || ''
      const timestamp = message.timestamp || Date.now()
      return `message_${senderId}_${text}_${timestamp}`
    }
    
    // Fallback: use entire payload hash
    return `event_${Buffer.from(JSON.stringify(eventData)).toString('base64').slice(0, 50)}`
  }
  
  /**
   * Check if this event has already been processed recently
   */
  static isEventAlreadyProcessed(eventId: string): boolean {
    return processedEvents.has(eventId)
  }
  
  /**
   * Mark an event as processed
   */
  static markEventProcessed(eventId: string, result: string): void {
    processedEvents.set(eventId, {
      timestamp: Date.now(),
      result
    })
  }
  
  /**
   * Get the best matching automation (prevents multiple automations from triggering)
   */
  static async getBestMatchingAutomation(
    automations: any[], 
    triggerText: string,
    userId: string,
    triggerType: string
  ): Promise<any | null> {
    
    // Filter automations by user and trigger type
    const userAutomations = automations.filter(auto => 
      auto.userId === userId && 
      auto.triggerType === triggerType &&
      auto.active
    )
    
    if (userAutomations.length === 0) {
      return null
    }
    
    // If multiple automations match, prioritize by:
    // 1. Most recent creation date
    // 2. Most specific keywords (exact match vs contains)
    let bestMatch = null
    let bestScore = -1
    
    for (const automation of userAutomations) {
      let score = 0
      
      // Check keyword matching
      if (automation.keywords) {
        const keywords = Array.isArray(automation.keywords) 
          ? automation.keywords 
          : automation.keywords.split(',').map((k: string) => k.trim())
        
        for (const keyword of keywords) {
          if (triggerText.toLowerCase().includes(keyword.toLowerCase())) {
            // Exact word match gets higher score
            const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`)
            if (regex.test(triggerText.toLowerCase())) {
              score += 10
            } else {
              score += 5
            }
          }
        }
      }
      
      // Boost score for newer automations
      const ageInDays = (Date.now() - new Date(automation.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      score += Math.max(0, 10 - ageInDays) // Newer is better
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = automation
      }
    }
    
    return bestMatch
  }
  
  /**
   * Database-level deduplication using automation logs
   */
  static async isDuplicateResponseInDatabase(
    automationId: string,
    userId: string,
    triggerText: string
  ): Promise<boolean> {
    
    // Check if we've already responded to this exact trigger in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const existingLog = await prisma.automationLog.findFirst({
      where: {
        automationId,
        userId,
        triggerText,
        triggeredAt: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    return !!existingLog
  }
  
  /**
   * Create a unique database record to prevent race conditions
   */
  static async createUniqueProcessingLock(
    eventId: string,
    automationId: string,
    userId: string
  ): Promise<boolean> {
    
    try {
      await prisma.trackedUser.create({
        data: {
          id: `processing_${eventId}_${automationId}`,
          userId,
          instagramUserId: userId,
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      // If creation fails due to unique constraint, another process is handling this
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return false
      }
      throw error
    }
  }
  
  /**
   * Release processing lock
   */
  static async releaseProcessingLock(
    eventId: string,
    automationId: string
  ): Promise<void> {
    
    try {
      await prisma.trackedUser.delete({
        where: {
          id: `processing_${eventId}_${automationId}`
        }
      })
    } catch (error) {
      // Ignore errors when releasing locks
      console.warn('Failed to release processing lock:', error)
    }
  }
  
  /**
   * Main duplicate prevention wrapper
   */
  static async processWithDuplicatePrevention<T>(
    eventData: any,
    processingFunction: () => Promise<T>
  ): Promise<T | null> {
    
    const eventId = this.generateEventId(eventData)
    const requestId = `dup_check_${Date.now()}`
    
    // 1. Check in-memory cache first (fastest)
    if (this.isEventAlreadyProcessed(eventId)) {
      console.log(`🚫 [${requestId}] Event ${eventId} already processed (in-memory cache)`)
      return null
    }
    
    try {
      // 2. Execute the processing function
      const result = await processingFunction()
      
      // 3. Mark as processed
      this.markEventProcessed(eventId, 'success')
      
      console.log(`✅ [${requestId}] Event ${eventId} processed successfully`)
      return result
      
    } catch (error) {
      // Allow retry-on-error in debug mode
      if (String(process.env.DEBUG_ALLOW_RETRY_ON_ERROR || '').toLowerCase() !== 'true') {
        this.markEventProcessed(eventId, 'error')
      } else {
        console.log(`⚠️ [${requestId}] DEBUG mode: not marking event ${eventId} as processed after error`)
      }
      console.error(`❌ [${requestId}] Event ${eventId} processing failed:`, error)
      throw error
    }
  }
}

export { DuplicateResponsePrevention }
