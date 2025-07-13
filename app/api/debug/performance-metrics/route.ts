import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory metrics storage for debugging
let performanceMetrics: any[] = []

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      metrics: performanceMetrics,
      count: performanceMetrics.length,
      message: 'Performance metrics debug endpoint'
    })
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    performanceMetrics = []
    
    return NextResponse.json({
      success: true,
      message: 'Performance metrics cleared'
    })
  } catch (error) {
    console.error('Error clearing performance metrics:', error)
    return NextResponse.json({ error: 'Failed to clear performance metrics' }, { status: 500 })
  }
}

// Helper function to add metrics (can be imported by other routes)
export function addPerformanceMetric(metric: any) {
  performanceMetrics.push({
    ...metric,
    timestamp: new Date().toISOString()
  })
  
  // Keep only last 100 metrics to prevent memory issues
  if (performanceMetrics.length > 100) {
    performanceMetrics = performanceMetrics.slice(-100)
  }
} 