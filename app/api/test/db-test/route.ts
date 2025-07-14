import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    console.log("🔍 Testing database connection...")
    
    // Test basic database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log("✅ Database connection test passed:", result)
    
    // Test user table access
    const userCount = await prisma.user.count()
    console.log("✅ User table accessible, count:", userCount)
    
    // Test account table access  
    const accountCount = await prisma.account.count()
    console.log("✅ Account table accessible, count:", accountCount)
    
    return NextResponse.json({
      success: true,
      databaseConnection: "OK",
      userCount,
      accountCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("❌ Database test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: {
        name: error instanceof Error ? error.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
} 