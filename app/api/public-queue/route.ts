import { NextResponse } from "next/server"

// Public endpoint for processing Instagram events without authentication
export async function GET() {
  try {
    // Simple test endpoint that shows it's working
    return NextResponse.json({
      success: true,
      message: "Public queue processor is accessible",
      timestamp: new Date().toISOString(),
      status: "ready"
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Public queue processor error"
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔄 Processing Instagram events via public endpoint...')
    
    // Note: This is a simplified processor that bypasses all auth
    // In production, you'd add proper validation here
    
    return NextResponse.json({
      success: true,
      message: "Public queue processing completed",
      processed: 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('💥 Public queue processing failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 