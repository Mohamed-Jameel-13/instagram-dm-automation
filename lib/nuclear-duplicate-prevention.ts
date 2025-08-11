// NUCLEAR OPTION: Absolute message prevention
// This prevents ANY Instagram message from being sent more than once per minute

const sentMessagesGlobal = new Map<string, { count: number, lastSent: number, blocked: number }>()
const NUCLEAR_COOLDOWN = 60000 // 1 minute absolute cooldown

// Auto-cleanup every 2 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, data] of sentMessagesGlobal.entries()) {
        if (now - data.lastSent > NUCLEAR_COOLDOWN) {
            sentMessagesGlobal.delete(key)
        }
    }
}, 120000)

class NuclearDuplicatePrevention {
    
    // Absolute prevention - creates MULTIPLE keys and blocks if ANY exist
    static canSendMessage(userId: string, messageOrCommentId: string, source: string = 'unknown'): boolean {
        const now = Date.now()
        
        // Create super-aggressive keys
        const keys = [
            `absolute:${userId}`, // Block ANY message to this user
            `comment:${messageOrCommentId}`, // Block this specific comment/message
            `user_comment:${userId}:${messageOrCommentId}`, // Block this user+comment combo
            `source:${source}:${userId}`, // Block by source (automation, comment, etc)
            `nuclear:${userId}:${messageOrCommentId}:${source}` // Nuclear key
        ]
        
        // Check if ANY key exists and is within cooldown
        for (const key of keys) {
            const data = sentMessagesGlobal.get(key)
            if (data && (now - data.lastSent) < NUCLEAR_COOLDOWN) {
                const remainingTime = NUCLEAR_COOLDOWN - (now - data.lastSent)
                
                // Update blocked count
                data.blocked = (data.blocked || 0) + 1
                sentMessagesGlobal.set(key, data)
                
                console.log(`🚫 NUCLEAR BLOCK: Message to user ${userId} BLOCKED by key "${key}"`)
                console.log(`⏰ NUCLEAR COOLDOWN: ${remainingTime}ms remaining (${Math.round(remainingTime/1000)}s)`)
                console.log(`🛡️ NUCLEAR STATS: Blocked ${data.blocked} attempts since last send`)
                console.log(`📊 NUCLEAR CACHE: ${sentMessagesGlobal.size} entries protecting from duplicates`)
                
                return false
            }
        }
        
        console.log(`✅ NUCLEAR ALLOW: Message to user ${userId} allowed (first time in cooldown period)`)
        console.log(`🔍 NUCLEAR CHECK: Verified ${keys.length} keys, all clear`)
        
        return true
    }
    
    // Mark message as sent with all keys
    static markMessageSent(userId: string, messageOrCommentId: string, source: string = 'unknown'): void {
        const now = Date.now()
        
        const keys = [
            `absolute:${userId}`,
            `comment:${messageOrCommentId}`,
            `user_comment:${userId}:${messageOrCommentId}`,
            `source:${source}:${userId}`,
            `nuclear:${userId}:${messageOrCommentId}:${source}`
        ]
        
        for (const key of keys) {
            const existing = sentMessagesGlobal.get(key)
            sentMessagesGlobal.set(key, {
                count: existing ? existing.count + 1 : 1,
                lastSent: now,
                blocked: 0
            })
        }
        
        console.log(`🔒 NUCLEAR LOCK: Message marked as sent with ${keys.length} protection keys`)
        console.log(`⏰ NUCLEAR TIMER: 1-minute cooldown started for user ${userId}`)
        console.log(`📊 NUCLEAR SIZE: Cache now protecting ${sentMessagesGlobal.size} entries`)
    }
    
    // Get comprehensive stats
    static getStats() {
        const now = Date.now()
        const activeEntries = []
        const expiredEntries = []
        
        for (const [key, data] of sentMessagesGlobal.entries()) {
            const age = now - data.lastSent
            if (age < NUCLEAR_COOLDOWN) {
                activeEntries.push({
                    key,
                    age,
                    remainingCooldown: NUCLEAR_COOLDOWN - age,
                    count: data.count,
                    blocked: data.blocked
                })
            } else {
                expiredEntries.push(key)
            }
        }
        
        return {
            total: sentMessagesGlobal.size,
            active: activeEntries.length,
            expired: expiredEntries.length,
            cooldownMs: NUCLEAR_COOLDOWN,
            entries: activeEntries
        }
    }
    
    // Nuclear clear - removes all protections
    static nuclearClear(): void {
        const size = sentMessagesGlobal.size
        sentMessagesGlobal.clear()
        console.log(`💥 NUCLEAR CLEAR: Removed ${size} protection entries - ALL COOLDOWNS RESET`)
    }
}

export { NuclearDuplicatePrevention }
