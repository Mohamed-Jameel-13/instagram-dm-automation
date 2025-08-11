import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Webhook Monitor - Checking system status...")
    
    return NextResponse.json({
      success: true,
      status: "Webhook monitor active",
      time: new Date().toISOString(),
      message: "This endpoint confirms your webhook URL is accessible",
      webhookUrl: "https://instagram-dm-automation.vercel.app/api/webhooks/instagram",
      instructions: [
        "1. Configure Instagram webhook URL in Meta Developer Console",
        "2. Comment on your Instagram post with trigger keywords", 
        "3. Monitor Vercel function logs for webhook activity",
        "4. Check for duplicate prevention messages in logs"
      ],
      diagnostics: "Visit /api/webhook-diagnosis for comprehensive system check"
    })
    
  } catch (error) {
    console.error("Webhook monitor error:", error)
    return NextResponse.json(
      { error: "Failed to check webhook status" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headers = Object.fromEntries(req.headers.entries())
    
    console.log("🚨 WEBHOOK MONITOR - Raw webhook received:")
    console.log("Headers:", JSON.stringify(headers, null, 2))
    console.log("Body:", body)
    console.log("Time:", new Date().toISOString())
    
    return NextResponse.json({
      status: "received",
      time: new Date().toISOString(),
      bodyLength: body.length,
      hasSignature: !!headers['x-hub-signature-256'],
      message: "Webhook received and logged - check console for details"
    })
  } catch (error) {
    console.error("Webhook monitor error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
} 