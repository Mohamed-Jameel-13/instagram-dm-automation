import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Inspecting recent webhook data...")
    
    // Get the most recent processed webhooks with their full data
    const recentWebhooks = await prisma.processedWebhook.findMany({
      orderBy: { processedAt: 'desc' },
      take: 5
    })
    
    const webhookDetails = []
    
    for (const webhook of recentWebhooks) {
      const detail: any = {
        requestId: webhook.requestId,
        eventId: webhook.eventId,
        processedAt: webhook.processedAt,
        result: webhook.result
      }
      
      // Use the stored webhookBody instead of trying to decode eventId
      try {
        if (webhook.webhookBody) {
          detail.webhookData = JSON.parse(webhook.webhookBody)
        }
      } catch (parseError) {
        detail.parseError = parseError instanceof Error ? parseError.message : "Failed to parse webhook body"
      }
      
      webhookDetails.push(detail)
    }
    
    // Also get recent automation logs to see what user IDs were extracted
    const recentLogs = await prisma.automationLog.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: 5
    })
    
    return NextResponse.json({
      success: true,
      message: "Webhook inspection completed",
      data: {
        recentWebhooks: webhookDetails,
        recentAutomationLogs: recentLogs.map(log => ({
          id: log.id,
          automationId: log.automationId,
          triggerType: log.triggerType,
          triggerText: log.triggerText,
          userId: log.userId,
          username: log.username,
          triggeredAt: log.triggeredAt,
          isEmpty: {
            userId: !log.userId || log.userId.trim() === '',
            username: !log.username || log.username.trim() === ''
          }
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Webhook inspection error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
