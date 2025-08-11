import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 COMPREHENSIVE TEST: Checking Instagram API integration")
    
    // Test environment variables with multiple possible names
    const possibleAppIds = [
      process.env.INSTAGRAM_APP_ID,
      process.env.FACEBOOK_APP_ID,
      process.env.META_APP_ID,
      process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
    ].filter(Boolean)
    
    const possibleAppSecrets = [
      process.env.INSTAGRAM_APP_SECRET,
      process.env.FACEBOOK_APP_SECRET,
      process.env.META_APP_SECRET,
      process.env.INSTAGRAM_CLIENT_SECRET
    ].filter(Boolean)
    
    console.log(`✅ Found ${possibleAppIds.length} potential App IDs`)
    console.log(`✅ Found ${possibleAppSecrets.length} potential App Secrets`)
    
    // Test database and get user's Instagram account
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get Instagram accounts to check access tokens
    const instagramAccounts = await prisma.account.findMany({
      where: {
        provider: "instagram"
      },
      select: {
        id: true,
        userId: true,
        providerAccountId: true,
        access_token: true,
        scope: true,
        expires_at: true
      }
    })
    
    console.log(`✅ Found ${instagramAccounts.length} Instagram accounts`)
    
    // Get active automations
    const automations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        triggerType: true,
        keywords: true,
        message: true,
        userId: true
      }
    })
    
    const commentAutomations = automations.filter(a => 
      a.triggerType === "comment" || a.triggerType === "follow_comment"
    )
    
    console.log(`✅ Found ${commentAutomations.length} comment automations`)
    
    // Test Instagram API access
    let apiTestResults = []
    
    for (const account of instagramAccounts) {
      try {
        if (!account.access_token) {
          apiTestResults.push({
            accountId: account.providerAccountId,
            status: "❌ No access token"
          })
          continue
        }
        
        // Test if access token is valid by making a simple API call
        const response = await fetch(`https://graph.facebook.com/v18.0/${account.providerAccountId}?fields=id,username&access_token=${account.access_token}`)
        
        if (response.ok) {
          const data = await response.json()
          apiTestResults.push({
            accountId: account.providerAccountId,
            status: "✅ API access working",
            username: data.username,
            tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : "Never"
          })
        } else {
          const errorData = await response.text()
          apiTestResults.push({
            accountId: account.providerAccountId,
            status: `❌ API call failed: ${response.status}`,
            error: errorData.slice(0, 200)
          })
        }
      } catch (error) {
        apiTestResults.push({
          accountId: account.providerAccountId,
          status: "❌ API test failed",
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    // Test the actual automation flow with a mock comment
    let automationTestResult = null
    
    try {
      const { handleInstagramComment } = await import('@/lib/instagram-processor');
      
      const testComment = {
        id: `test_comprehensive_${Date.now()}`,
        text: "no",
        from: {
          id: "1960009881070275",
          username: "md._.jameel"
        },
        media: {
          id: "18080571787866479"
        },
        parent_id: null
      }
      
      console.log("🚀 Testing handleInstagramComment with mock data...")
      await handleInstagramComment(testComment, `test_${Date.now()}`, "24695355950081100")
      automationTestResult = "✅ Function executed without error"
      
    } catch (error) {
      automationTestResult = `❌ Function failed: ${error instanceof Error ? error.message : String(error)}`
    }
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: "Comprehensive test completed",
      results: {
        environment: {
          appIdsFound: possibleAppIds.length,
          appSecretsFound: possibleAppSecrets.length,
          appIdPreview: possibleAppIds[0] ? `${possibleAppIds[0].slice(0, 8)}...` : "None"
        },
        database: {
          instagramAccountsFound: instagramAccounts.length,
          activeAutomations: automations.length,
          commentAutomations: commentAutomations.length
        },
        instagramAccounts: instagramAccounts.map(acc => ({
          providerAccountId: acc.providerAccountId,
          hasAccessToken: !!acc.access_token,
          tokenLength: acc.access_token?.length || 0,
          scope: acc.scope,
          expiresAt: acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : "Never"
        })),
        apiTests: apiTestResults,
        automationTest: automationTestResult,
        automations: commentAutomations.map(auto => ({
          id: auto.id,
          type: auto.triggerType,
          keywords: auto.keywords,
          hasMessage: !!auto.message,
          messagePreview: auto.message?.slice(0, 50) + "..."
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("💥 Comprehensive test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
