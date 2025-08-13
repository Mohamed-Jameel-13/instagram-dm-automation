import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Instagram account with full details
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram"
      }
    })

    if (!account) {
      return NextResponse.json({ 
        error: "No Instagram account found" 
      }, { status: 404 })
    }

    const result: any = {
      account: {
        id: account.id,
        userId: account.userId,
        providerAccountId: account.providerAccountId,
        hasAccessToken: !!account.access_token,
        tokenLength: account.access_token?.length || 0,
        tokenPrefix: account.access_token?.substring(0, 10) || null,
        scope: account.scope,
        created: account.created_at,
        updated: account.updated_at
      },
      tests: []
    }

    if (account.access_token) {
      // Test 1: Business API
      try {
        console.log("Testing Business API...")
        const businessResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.providerAccountId}?fields=id,username,account_type&access_token=${account.access_token}`
        )
        
        const businessTest = {
          type: "Business API",
          url: `https://graph.facebook.com/v18.0/${account.providerAccountId}?fields=id,username,account_type&access_token=***`,
          status: businessResponse.status,
          success: businessResponse.ok,
          data: null,
          error: null
        }

        if (businessResponse.ok) {
          businessTest.data = await businessResponse.json()
        } else {
          businessTest.error = await businessResponse.text()
        }

        result.tests.push(businessTest)
      } catch (error) {
        result.tests.push({
          type: "Business API",
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Test 2: Basic Display API
      try {
        console.log("Testing Basic Display API...")
        const basicResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${account.access_token}`
        )
        
        const basicTest = {
          type: "Basic Display API",
          url: `https://graph.instagram.com/me?fields=id,username&access_token=***`,
          status: basicResponse.status,
          success: basicResponse.ok,
          data: null,
          error: null
        }

        if (basicResponse.ok) {
          basicTest.data = await basicResponse.json()
        } else {
          basicTest.error = await basicResponse.text()
        }

        result.tests.push(basicTest)
      } catch (error) {
        result.tests.push({
          type: "Basic Display API",
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Test 3: Facebook Graph API (without account ID)
      try {
        console.log("Testing Facebook Graph API...")
        const fbResponse = await fetch(
          `https://graph.facebook.com/me?fields=id,name&access_token=${account.access_token}`
        )
        
        const fbTest = {
          type: "Facebook Graph API",
          url: `https://graph.facebook.com/me?fields=id,name&access_token=***`,
          status: fbResponse.status,
          success: fbResponse.ok,
          data: null,
          error: null
        }

        if (fbResponse.ok) {
          fbTest.data = await fbResponse.json()
        } else {
          fbTest.error = await fbResponse.text()
        }

        result.tests.push(fbTest)
      } catch (error) {
        result.tests.push({
          type: "Facebook Graph API",
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Analysis
    result.analysis = {
      tokenType: "unknown",
      isExpired: false,
      canUseForAutomation: false,
      recommendations: []
    }

    const successfulTests = result.tests.filter((t: any) => t.success)
    if (successfulTests.length > 0) {
      result.analysis.tokenType = successfulTests[0].type
      result.analysis.canUseForAutomation = successfulTests.some((t: any) => 
        t.type === "Business API" || t.type === "Facebook Graph API"
      )
    } else {
      result.analysis.isExpired = result.tests.some((t: any) => 
        t.error?.includes("OAuthException") || t.error?.includes("Invalid OAuth")
      )
    }

    if (result.analysis.isExpired) {
      result.analysis.recommendations.push("Token appears to be expired - need to get a fresh token")
    } else if (!result.analysis.canUseForAutomation) {
      result.analysis.recommendations.push("Token only works with Basic Display API - need Business API token for automation")
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Detailed token debug error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
