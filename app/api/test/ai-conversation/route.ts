import { NextRequest, NextResponse } from "next/server"
import { ConversationManager } from "@/lib/conversation-manager"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const testType = searchParams.get('type') || 'info'
    
    const mockUserId = "test-user-id"
    const mockInstagramUserId = "test-instagram-user-123"
    const mockAutomationId = "test-automation-id"
    
    if (testType === 'demo') {
      console.log("🚀 Starting AI Conversation Demo...")
      
      // 1. Start conversation
      await ConversationManager.startConversation(
        mockUserId,
        mockInstagramUserId,
        mockAutomationId,
        "hi there"
      )
      
      // 2. Check status
      const status = await ConversationManager.isInActiveConversation(
        mockUserId,
        mockInstagramUserId
      )
      
      // 3. Add messages
      await ConversationManager.addMessageToConversation(
        mockUserId,
        mockInstagramUserId,
        mockAutomationId,
        "user",
        "can you help me?"
      )
      
      await ConversationManager.addMessageToConversation(
        mockUserId,
        mockInstagramUserId,
        mockAutomationId,
        "assistant",
        "Of course! I'd be happy to help you."
      )
      
      // 4. Get context
      const context = await ConversationManager.getConversationContext(
        mockUserId,
        mockInstagramUserId,
        mockAutomationId
      )
      
      // 5. Clean up
      await ConversationManager.endConversation(
        mockUserId,
        mockInstagramUserId,
        mockAutomationId
      )
      
      return NextResponse.json({
        success: true,
        message: "AI Conversation demo completed successfully!",
        results: {
          conversationStarted: true,
          statusCheck: status,
          messagesAdded: true,
          contextRetrieved: !!context,
          messageCount: context?.messages.length || 0,
          cleanedUp: true
        }
      })
    }
    
    if (testType === 'cleanup') {
      await ConversationManager.cleanupOldConversations()
      return NextResponse.json({
        success: true,
        message: "Cleanup completed"
      })
    }
    
    return NextResponse.json({
      success: true,
      message: "AI Conversation test endpoint",
      availableTests: [
        "?type=demo - Run conversation demo",
        "?type=cleanup - Clean up old conversations"
      ]
    })
    
  } catch (error) {
    console.error("Error in AI conversation test:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 