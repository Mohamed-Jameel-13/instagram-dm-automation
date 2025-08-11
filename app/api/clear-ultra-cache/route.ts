import { type NextRequest, NextResponse } from "next/server"
import { UltraDuplicatePrevention } from "@/lib/ultra-duplicate-prevention"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  
  try {
    if (action === 'clear') {
      UltraDuplicatePrevention.clear()
      return NextResponse.json({
        success: true,
        message: "Ultra duplicate prevention cache cleared successfully",
        timestamp: new Date().toISOString(),
        action: "cleared"
      })
    }
    
    const stats = UltraDuplicatePrevention.getStats()
    
    return NextResponse.json({
      success: true,
      message: "Ultra duplicate prevention status",
      timestamp: new Date().toISOString(),
      stats,
      explanation: {
        cooldownPeriod: "1 minute (60,000ms)",
        purpose: "Prevents ANY duplicate messages within 1 minute",
        keys: "Multiple keys per message for maximum protection",
        clearCache: "Add ?action=clear to URL to clear cache"
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
