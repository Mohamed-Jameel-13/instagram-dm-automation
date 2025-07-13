import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  console.log("Webhook test GET request received")
  return new Response("Webhook test endpoint is working!", { status: 200 })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headers = req.headers
  
  console.log("=== WEBHOOK TEST ===")
  console.log("POST request received at:", new Date().toISOString())
  console.log("Headers:", Object.fromEntries(headers.entries()))
  console.log("Body:", body)
  console.log("===================")
  
  return NextResponse.json({ 
    received: true, 
    timestamp: new Date().toISOString(),
    bodyLength: body.length 
  })
}
