import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `simple_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Running simple automation test...`)
    
    // Temporarily disable post restrictions on your main automation
    const automation = await prisma.automation.update({
      where: { 
        id: "cmd4bcyq70003js04du24za4j" // Your "test" automation ID
      },
      data: {
        posts: "[]" // Remove post restrictions temporarily
      }
    })
    
    console.log(`🧪 [${requestId}] Removed post restrictions from automation: ${automation.name}`)
    
    // Test Instagram API call
    const instagramAccount = await prisma.account.findFirst({
      where: {
        userId: "6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2",
        provider: "instagram"
      }
    })
    
    if (!instagramAccount) {
      throw new Error("Instagram account not found")
    }
    
    console.log(`🧪 [${requestId}] Found Instagram account: ${instagramAccount.providerAccountId}`)
    
    // Test Instagram API access
    const testResponse = await fetch(
      `https://graph.instagram.com/v18.0/${instagramAccount.providerAccountId}?fields=id,username&access_token=${instagramAccount.access_token}`
    )
    
    let apiStatus = "unknown"
    if (testResponse.ok) {
      const data = await testResponse.json()
      apiStatus = "working"
      console.log(`🧪 [${requestId}] Instagram API test successful:`, data)
    } else {
      apiStatus = "failed"
      console.log(`🧪 [${requestId}] Instagram API test failed:`, testResponse.status)
    }
    
    return NextResponse.json({
      success: true,
      requestId,
      message: "Post restrictions removed - try commenting 'hello' on ANY of your Instagram posts now!",
      automation: {
        id: automation.id,
        name: automation.name,
        posts: automation.posts,
        keywords: JSON.parse(automation.keywords || '[]')
      },
      instagram: {
        accountId: instagramAccount.providerAccountId,
        apiStatus
      }
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Simple test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 