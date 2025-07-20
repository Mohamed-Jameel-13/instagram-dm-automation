import { type NextRequest, NextResponse } from "next/server"
import { GlobalDuplicatePrevention } from "@/lib/global-duplicate-prevention"

export async function GET(req: NextRequest) {
  const requestId = `global_status_${Date.now()}`
  
  try {
    const stats = GlobalDuplicatePrevention.getStats()
    
    return NextResponse.json({
      success: true,
      message: "Global duplicate prevention status",
      requestId,
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = `global_clear_${Date.now()}`
  
  try {
    GlobalDuplicatePrevention.clear()
    
    return NextResponse.json({
      success: true,
      message: "Global duplicate prevention cache cleared",
      requestId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear cache", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
