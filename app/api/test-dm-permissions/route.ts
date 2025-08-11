import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 DM PERMISSION TEST: Testing Instagram DM capabilities")
    
    // Get Instagram account details
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const instagramAccount = await prisma.account.findFirst({
      where: {
        provider: "instagram"
      },
      select: {
        providerAccountId: true,
        access_token: true,
        scope: true
      }
    })
    
    if (!instagramAccount?.access_token) {
      throw new Error("No Instagram account found")
    }
    
    // Test 1: Check account permissions
    console.log("✅ Test 1: Checking account permissions")
    const accountResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramAccount.providerAccountId}?fields=id,username,account_type&access_token=${instagramAccount.access_token}`)
    const accountData = await accountResponse.json()
    
    // Test 2: Try different user IDs to understand the messaging constraints
    const testUsers = [
      { id: "1960009881070275", name: "md._.jameel (real user)" },
      { id: "17841400027244616", name: "test user 1" },
      { id: "17841400264007079", name: "test user 2" }
    ]
    
    let messagingTests = []
    
    for (const testUser of testUsers) {
      try {
        console.log(`🧪 Testing DM to ${testUser.name}`)
        
        const dmResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramAccount.providerAccountId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instagramAccount.access_token}`,
          },
          body: JSON.stringify({
            recipient: { 
              id: testUser.id
            },
            message: { 
              text: "Test message from automation system"
            }
          }),
        })
        
        if (dmResponse.ok) {
          const result = await dmResponse.json()
          messagingTests.push({
            user: testUser.name,
            status: "✅ Success",
            messageId: result.id || "unknown"
          })
        } else {
          const errorData = await dmResponse.json()
          messagingTests.push({
            user: testUser.name,
            status: "❌ Failed",
            error: errorData.error?.message || "Unknown error",
            errorCode: errorData.error?.code,
            errorSubcode: errorData.error?.error_subcode
          })
        }
        
      } catch (error) {
        messagingTests.push({
          user: testUser.name,
          status: "❌ Exception",
          error: error instanceof Error ? error.message : String(error)
        })
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Test 3: Check if account can send messages at all
    console.log("✅ Test 3: Checking messaging permissions")
    const permissionsResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramAccount.providerAccountId}/conversations?access_token=${instagramAccount.access_token}`)
    const conversationsResult = permissionsResponse.ok ? await permissionsResponse.json() : { error: "Cannot access conversations" }
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: "DM permission test completed",
      results: {
        account: {
          id: accountData.id,
          username: accountData.username,
          accountType: accountData.account_type,
          scope: instagramAccount.scope
        },
        messagingTests,
        conversationsAccess: conversationsResult.error ? "❌ No access" : "✅ Can access conversations",
        conversationCount: conversationsResult.data?.length || 0,
        recommendations: [
          "1. Instagram restricts DMs to users who haven't previously messaged your business",
          "2. Users must initiate contact first, or have commented on your posts",
          "3. Consider using comment replies instead of direct messages",
          "4. Check if users have messaging restrictions in their privacy settings"
        ]
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("💥 DM permission test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
