import { NextRequest, NextResponse } from "next/server"

// Simple webhook monitoring endpoint to debug webhook delivery
export async function GET() {
  return NextResponse.json({
    status: "Webhook monitor active",
    time: new Date().toISOString(),
    message: "This endpoint confirms your webhook URL is accessible",
    webhookUrl: "https://instagram-dm-automation-b5yydpz7z-jameels-projects-13.vercel.app/api/webhooks/instagram"
  })
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
      hasSignature: !!headers['x-hub-signature-256']
    })
  } catch (error) {
    console.error("Webhook monitor error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
