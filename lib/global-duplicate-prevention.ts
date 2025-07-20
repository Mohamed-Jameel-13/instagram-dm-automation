// Global duplicate prevention for DM responses
// This prevents ANY duplicate DMs from being sent

const sentMessages = new Map<string, { timestamp: number, count: number }>()
const MESSAGE_COOLDOWN = 30000 // 30 seconds cooldown between identical messages
const MAX_MESSAGES_PER_USER = 1 // Maximum 1 message per user per trigger

// Clean up old entries every 2 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of sentMessages.entries()) {
    if (now - value.timestamp > MESSAGE_COOLDOWN) {
      sentMessages.delete(key)
    }
  }
}, 120000)

class GlobalDuplicatePrevention {
  
  static canSendMessage(commentId: string, userId: string, automationId: string, messageText: string): boolean {
    // Create multiple keys to check different scenarios
    const keys = [
      `comment_${commentId}`, // Same comment
      `user_${userId}_auto_${automationId}`, // Same user + automation
      `user_${userId}_msg_${messageText.slice(0, 50)}`, // Same user + message content
      `global_${commentId}_${userId}` // Global key
    ]
    
    const now = Date.now()
    
    for (const key of keys) {
      const existing = sentMessages.get(key)
      if (existing && (now - existing.timestamp) < MESSAGE_COOLDOWN) {
        console.log(`🚫 GlobalDuplicatePrevention: Blocked duplicate message (key: ${key}, age: ${now - existing.timestamp}ms)`)
        return false
      }
    }
    
    return true
  }
  
  static markMessageSent(commentId: string, userId: string, automationId: string, messageText: string): void {
    const keys = [
      `comment_${commentId}`,
      `user_${userId}_auto_${automationId}`,
      `user_${userId}_msg_${messageText.slice(0, 50)}`,
      `global_${commentId}_${userId}`
    ]
    
    const now = Date.now()
    
    for (const key of keys) {
      const existing = sentMessages.get(key)
      sentMessages.set(key, {
        timestamp: now,
        count: existing ? existing.count + 1 : 1
      })
    }
    
    console.log(`✅ GlobalDuplicatePrevention: Marked message sent for ${keys.length} keys`)
  }
  
  static getStats() {
    return {
      totalKeys: sentMessages.size,
      keys: Array.from(sentMessages.keys()),
      cooldownPeriod: MESSAGE_COOLDOWN
    }
  }
  
  static clear() {
    sentMessages.clear()
    console.log(`🧹 GlobalDuplicatePrevention: Cache cleared`)
  }
}

export { GlobalDuplicatePrevention }
