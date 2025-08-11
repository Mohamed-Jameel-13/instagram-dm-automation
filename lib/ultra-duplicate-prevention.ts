// Ultra-aggressive duplicate prevention
// This prevents ANY message from being sent twice within a specific timeframe

const messageHistory = new Map<string, number>()
const ABSOLUTE_COOLDOWN = 60000 // 1 minute absolute cooldown

// Auto-clear on module reload (development)
if (typeof global !== 'undefined') {
    (global as any).__ultraDuplicatePreventionClear = () => {
        messageHistory.clear()
        console.log('🚀 Ultra duplicate prevention cache auto-cleared on restart')
    }
}

// Clean up old entries every 2 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, timestamp] of messageHistory.entries()) {
        if (now - timestamp > ABSOLUTE_COOLDOWN) {
            messageHistory.delete(key)
        }
    }
}, 120000)

class UltraDuplicatePrevention {
    
    static canSendMessage(commentId: string, userId: string, automationId: string): boolean {
        // Create multiple keys to absolutely prevent any duplicates
        const keys = [
            `comment:${commentId}`,
            `user:${userId}:automation:${automationId}`,
            `global:${commentId}:${userId}`,
            `ultra:${userId}:${automationId}:${commentId}`
        ]
        
        const now = Date.now()
        
        // Check if ANY key exists within cooldown period
        for (const key of keys) {
            const lastSent = messageHistory.get(key)
            if (lastSent && (now - lastSent) < ABSOLUTE_COOLDOWN) {
                const remainingTime = ABSOLUTE_COOLDOWN - (now - lastSent)
                console.log(`🚫 ULTRA BLOCK: Message blocked by key "${key}" (cooldown: ${remainingTime}ms remaining)`)
                console.log(`🛡️ ULTRA STATS: Cache has ${messageHistory.size} entries, protecting from duplicates`)
                return false
            }
        }
        
        console.log(`✅ ULTRA ALLOW: Message allowed (no conflicts found in ${messageHistory.size} cached entries)`)
        return true
    }
    
    static markMessageSent(commentId: string, userId: string, automationId: string): void {
        const keys = [
            `comment:${commentId}`,
            `user:${userId}:automation:${automationId}`,
            `global:${commentId}:${userId}`,
            `ultra:${userId}:${automationId}:${commentId}`
        ]
        
        const now = Date.now()
        
        for (const key of keys) {
            messageHistory.set(key, now)
        }
        
        console.log(`🔒 ULTRA LOCK: Message marked as sent for ${keys.length} keys (1-minute cooldown active)`)
        console.log(`📊 ULTRA STATUS: Cache now has ${messageHistory.size} total entries`)
    }
    
    static getStats() {
        return {
            totalEntries: messageHistory.size,
            cooldownMs: ABSOLUTE_COOLDOWN,
            entries: Array.from(messageHistory.entries()).map(([key, timestamp]) => ({
                key,
                timestamp,
                age: Date.now() - timestamp,
                remainingCooldown: Math.max(0, ABSOLUTE_COOLDOWN - (Date.now() - timestamp))
            }))
        }
    }
    
    static clear() {
        messageHistory.clear()
        console.log(`🧹 ULTRA CLEAR: All message history cleared`)
    }
}

export { UltraDuplicatePrevention }
