import { type NextRequest, NextResponse } from "next/server"
import { UltraDuplicatePrevention } from "@/lib/ultra-duplicate-prevention"

export async function GET(req: NextRequest) {
  try {
    const stats = UltraDuplicatePrevention.getStats()
    
    return NextResponse.json({
      success: true,
      message: "Ultra duplicate prevention status",
      timestamp: new Date().toISOString(),
      stats,
      explanation: {
        cooldownPeriod: "1 minute (60,000ms)",
        purpose: "Prevents ANY duplicate messages within 1 minute",
        keys: "Multiple keys per message for maximum protection"
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    UltraDuplicatePrevention.clear()
    
    return NextResponse.json({
      success: true,
      message: "Ultra duplicate prevention cache cleared",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear cache", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
