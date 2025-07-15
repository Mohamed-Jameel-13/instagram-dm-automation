import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const requestId = `token_test_${Date.now()}`
  
  try {
    console.log(`🧪 [${requestId}] Starting token test...`)
    
    const body = await req.json()
    const { accessToken } = body
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "Access token is required"
      }, { status: 400 })
    }
    
    const results = {
      tokenValid: false,
      tokenType: "unknown",
      accountInfo: null,
      permissions: {
        canGetProfile: false,
        canManageMessages: false,
        canManageComments: false
      },
      issues: [],
      recommendations: []
    }
    
    // Test 1: Basic profile access
    try {
      console.log(`🧪 [${requestId}] Testing basic profile access...`)
      const profileResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
      )
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        results.tokenValid = true
        results.accountInfo = profileData
        results.permissions.canGetProfile = true
        
        if (profileData.account_type === "BUSINESS") {
          results.tokenType = "business_api"
          console.log(`✅ [${requestId}] Business account detected: @${profileData.username}`)
        } else {
          results.tokenType = "basic_display_api"
          console.log(`⚠️ [${requestId}] Personal account detected: @${profileData.username}`)
          results.issues.push("Account is not a business account - required for DM automation")
          results.recommendations.push("Convert Instagram account to Business in Instagram settings")
        }
      } else {
        // Try Basic Display API format
        const basicResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
        )
        
        if (basicResponse.ok) {
          const basicData = await basicResponse.json()
          results.tokenValid = true
          results.accountInfo = { ...basicData, account_type: "PERSONAL" }
          results.permissions.canGetProfile = true
          results.tokenType = "basic_display_api"
          results.issues.push("This is a Basic Display API token - cannot send DMs")
          results.recommendations.push("Generate Instagram Business API token instead")
        } else {
          results.issues.push("Token is invalid or expired")
          results.recommendations.push("Generate a new token from Facebook Developer Console")
        }
      }
    } catch (error) {
      results.issues.push("Failed to test basic profile access")
      console.error(`❌ [${requestId}] Profile test error:`, error)
    }
    
    // Test 2: Messaging permissions (only for business tokens)
    if (results.tokenValid && results.accountInfo) {
      try {
        console.log(`🧪 [${requestId}] Testing messaging permissions...`)
        const conversationResponse = await fetch(
          `https://graph.instagram.com/v18.0/${results.accountInfo.id}/conversations?access_token=${accessToken}`
        )
        
        if (conversationResponse.ok) {
          results.permissions.canManageMessages = true
          console.log(`✅ [${requestId}] Messaging permissions confirmed`)
        } else {
          const errorData = await conversationResponse.text()
          console.log(`❌ [${requestId}] Messaging test failed:`, errorData)
          results.issues.push("Token missing instagram_manage_messages permission")
          results.recommendations.push("Add instagram_manage_messages permission in Facebook App")
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Messaging test error:`, error)
      }
      
      // Test 3: Comments permissions
      try {
        console.log(`🧪 [${requestId}] Testing comments permissions...`)
        const mediaResponse = await fetch(
          `https://graph.instagram.com/v18.0/${results.accountInfo.id}/media?fields=id&limit=1&access_token=${accessToken}`
        )
        
        if (mediaResponse.ok) {
          results.permissions.canManageComments = true
          console.log(`✅ [${requestId}] Comments permissions confirmed`)
        } else {
          results.issues.push("Token missing instagram_manage_comments permission")
          results.recommendations.push("Add instagram_manage_comments permission in Facebook App")
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Comments test error:`, error)
      }
    }
    
    // Summary
    const summary = {
      readyForAutomation: results.permissions.canManageMessages && results.permissions.canManageComments,
      tokenType: results.tokenType,
      issuesCount: results.issues.length
    }
    
    if (summary.readyForAutomation) {
      console.log(`✅ [${requestId}] Token is ready for DM automation!`)
    } else {
      console.log(`❌ [${requestId}] Token needs fixes: ${results.issues.join(", ")}`)
    }
    
    return NextResponse.json({
      success: true,
      requestId,
      results,
      summary
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Token test failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 