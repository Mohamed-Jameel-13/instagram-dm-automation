import { prisma } from "@/lib/db"

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface ConversationContext {
  automationId: string
  messages: ConversationMessage[]
  isActive: boolean
  lastActivityAt: Date
}

export class ConversationManager {
  /**
   * Start a new conversation session with a user
   */
  static async startConversation(
    userId: string,
    instagramUserId: string, 
    automationId: string,
    initialUserMessage?: string
  ): Promise<void> {
    console.log(`🚀 Starting new conversation: userId=${userId}, instagramUserId=${instagramUserId}, automationId=${automationId}`)
    
    // Check if an active conversation already exists
    const existingConversation = await prisma.conversationSession.findFirst({
      where: {
        userId,
        instagramUserId,
        automationId,
        isActive: true
      }
    })
    
    if (existingConversation) {
      console.log(`✅ Conversation already active for user ${instagramUserId}`)
      
      // Update the last activity time
      await prisma.conversationSession.update({
        where: { id: existingConversation.id },
        data: { 
          lastActivityAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      if (initialUserMessage) {
        await this.addMessageToConversation(userId, instagramUserId, automationId, "user", initialUserMessage)
      }
      
      return
    }
    
    // Create initial conversation history
    const initialHistory: ConversationMessage[] = []
    if (initialUserMessage) {
      initialHistory.push({
        role: "user",
        content: initialUserMessage,
        timestamp: new Date()
      })
    }
    
    // Create new conversation session
    await prisma.conversationSession.create({
      data: {
        userId,
        instagramUserId,
        automationId,
        isActive: true,
        conversationHistory: JSON.stringify(initialHistory),
        lastActivityAt: new Date()
      }
    })
    
    console.log(`✅ New conversation started for user ${instagramUserId}`)
  }
  
  /**
   * Check if a user is in an active conversation
   */
  static async isInActiveConversation(
    userId: string,
    instagramUserId: string
  ): Promise<{ isActive: boolean; automationId?: string }> {
    const activeConversation = await prisma.conversationSession.findFirst({
      where: {
        userId,
        instagramUserId,
        isActive: true
      },
      orderBy: {
        lastActivityAt: 'desc'
      }
    })
    
    if (!activeConversation) {
      return { isActive: false }
    }
    
    // Check if conversation is stale (older than 24 hours)
    const now = new Date()
    const hoursSinceLastActivity = (now.getTime() - activeConversation.lastActivityAt.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastActivity > 24) {
      console.log(`⏰ Conversation for user ${instagramUserId} is stale (${hoursSinceLastActivity.toFixed(1)} hours old), marking as inactive`)
      
      // Mark as inactive
      await prisma.conversationSession.update({
        where: { id: activeConversation.id },
        data: { isActive: false }
      })
      
      return { isActive: false }
    }
    
    return { 
      isActive: true,
      automationId: activeConversation.automationId
    }
  }
  
  /**
   * Add a message to an existing conversation
   */
  static async addMessageToConversation(
    userId: string,
    instagramUserId: string,
    automationId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    const conversation = await prisma.conversationSession.findFirst({
      where: {
        userId,
        instagramUserId,
        automationId,
        isActive: true
      }
    })
    
    if (!conversation) {
      console.log(`⚠️  No active conversation found for user ${instagramUserId}`)
      return
    }
    
    // Parse existing history
    let history: ConversationMessage[] = []
    if (conversation.conversationHistory) {
      try {
        history = JSON.parse(conversation.conversationHistory)
      } catch (error) {
        console.error("Error parsing conversation history:", error)
        history = []
      }
    }
    
    // Add new message
    history.push({
      role,
      content,
      timestamp: new Date()
    })
    
    // Keep only last 20 messages to avoid growing too large
    if (history.length > 20) {
      history = history.slice(-20)
    }
    
    // Update conversation
    await prisma.conversationSession.update({
      where: { id: conversation.id },
      data: {
        conversationHistory: JSON.stringify(history),
        lastActivityAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`💬 Added ${role} message to conversation for user ${instagramUserId}`)
  }
  
  /**
   * Get conversation context for AI responses
   */
  static async getConversationContext(
    userId: string,
    instagramUserId: string,
    automationId: string
  ): Promise<ConversationContext | null> {
    const conversation = await prisma.conversationSession.findFirst({
      where: {
        userId,
        instagramUserId,
        automationId,
        isActive: true
      }
    })
    
    if (!conversation) {
      return null
    }
    
    // Parse conversation history
    let messages: ConversationMessage[] = []
    if (conversation.conversationHistory) {
      try {
        messages = JSON.parse(conversation.conversationHistory)
      } catch (error) {
        console.error("Error parsing conversation history:", error)
        messages = []
      }
    }
    
    return {
      automationId: conversation.automationId,
      messages,
      isActive: conversation.isActive,
      lastActivityAt: conversation.lastActivityAt
    }
  }
  
  /**
   * End a conversation session
   */
  static async endConversation(
    userId: string,
    instagramUserId: string,
    automationId?: string
  ): Promise<void> {
    const whereClause: any = {
      userId,
      instagramUserId,
      isActive: true
    }
    
    if (automationId) {
      whereClause.automationId = automationId
    }
    
    await prisma.conversationSession.updateMany({
      where: whereClause,
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })
    
    console.log(`🔚 Ended conversation for user ${instagramUserId}`)
  }
  
  /**
   * Clean up old inactive conversations (older than 7 days)
   */
  static async cleanupOldConversations(): Promise<void> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const deletedCount = await prisma.conversationSession.deleteMany({
      where: {
        isActive: false,
        updatedAt: {
          lt: sevenDaysAgo
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${deletedCount.count} old conversation sessions`)
  }
} 