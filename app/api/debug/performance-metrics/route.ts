import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceMetrics, clearPerformanceMetrics } from '@/app/api/webhooks/instagram/route'

export async function GET(req: NextRequest) {
  try {
    const metrics = getPerformanceMetrics()
    
    return NextResponse.json({
      success: true,
      metrics: metrics,
      count: metrics.length
    })
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    clearPerformanceMetrics()
    
    return NextResponse.json({
      success: true,
      message: 'Performance metrics cleared'
    })
  } catch (error) {
    console.error('Error clearing performance metrics:', error)
    return NextResponse.json({ error: 'Failed to clear performance metrics' }, { status: 500 })
  }
} 