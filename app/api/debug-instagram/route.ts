import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

type ApiTestResult =
  | { success: true; accountType: string; username: string; id: string }
  | { success: false; error: string; status?: number }
  | { success: false; error: string }

type AccountDebug = {
  userId: string
  providerAccountId: string
  hasAccessToken: boolean
  accessTokenPreview: string | null
  scope: string | null
  hasMessagingScope?: boolean
  hasCommentsScope?: boolean
  tokenStatus: "unknown" | "valid" | "invalid" | "error"
  apiTest: ApiTestResult | null
}

type Issue = { account: string; issue: string; solution: string }

export async function GET(req: NextRequest) {
  const requestId = `debug_instagram_${Date.now()}`
  
  try {
    console.log(`🔍 [${requestId}] Starting Instagram configuration debug...`)
    
    const debug: { accounts: AccountDebug[]; issues: Issue[]; recommendations: string[] } = {
      accounts: [],
      issues: [],
      recommendations: []
    }
    
    // Check Instagram accounts in database
    console.log(`🔍 [${requestId}] Checking Instagram accounts...`)
    const instagramAccounts = await prisma.account.findMany({
      where: {
        provider: "instagram"
      },
      include: {
        user: true
      }
    })
    
    console.log(`🔍 [${requestId}] Found ${instagramAccounts.length} Instagram accounts`)
    
    for (const account of instagramAccounts) {
      const accountDebug: AccountDebug = {
        userId: account.userId,
        providerAccountId: account.providerAccountId,
        hasAccessToken: !!account.access_token,
        accessTokenPreview: account.access_token ? 
          `${account.access_token.substring(0, 10)}...` : null,
        scope: account.scope,
        hasMessagingScope: account.scope?.includes("instagram_manage_messages"),
        hasCommentsScope: account.scope?.includes("instagram_manage_comments"),
        tokenStatus: "unknown",
        apiTest: null
      }
      
      // Test Instagram API with this token
      if (account.access_token) {
        try {
          console.log(`🔍 [${requestId}] Testing Instagram API for account ${account.providerAccountId}`)
          
          // Test basic API call
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${account.providerAccountId}?fields=id,username,account_type&access_token=${account.access_token}`
          )
          
          if (response.ok) {
            const data = await response.json()
            accountDebug.tokenStatus = "valid"
            accountDebug.apiTest = {
              success: true,
              accountType: data.account_type,
              username: data.username,
              id: data.id
            }
            
            // Check if it's a business account
            if (data.account_type !== "BUSINESS") {
              debug.issues.push({
                account: account.providerAccountId,
                issue: "Account is not a business account",
                solution: "Convert Instagram account to Business account in Instagram settings"
              })
            }
            
          } else {
            const errorData = await response.text()
            accountDebug.tokenStatus = "invalid"
            accountDebug.apiTest = {
              success: false,
              error: errorData,
              status: response.status
            }
            
            debug.issues.push({
              account: account.providerAccountId,
              issue: "Instagram API token is invalid or expired",
              solution: "Reconnect Instagram account in your dashboard"
            })
          }
        } catch (error) {
          accountDebug.tokenStatus = "error"
          accountDebug.apiTest = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }
          
          debug.issues.push({
            account: account.providerAccountId,
            issue: "Error testing Instagram API",
            solution: "Check network connectivity and try reconnecting Instagram account"
          })
        }
      } else {
        debug.issues.push({
          account: account.providerAccountId,
          issue: "No access token found",
          solution: "Connect Instagram account through your dashboard"
        })
      }
      
      // Check permissions
      if (!account.scope?.includes("instagram_manage_messages")) {
        debug.issues.push({
          account: account.providerAccountId,
          issue: "Missing instagram_manage_messages permission",
          solution: "Reconnect Instagram with proper business account permissions"
        })
      }
      
      debug.accounts.push(accountDebug)
    }
    
    // Check for active automations
    const automations = await prisma.automation.findMany({
      where: { active: true }
    })
    
    debug.recommendations = [
      "Ensure Instagram account is converted to Business account",
      "Make sure you have instagram_manage_messages and instagram_manage_comments permissions",
      "Test sending DMs manually from Instagram business account first",
      "Check that Instagram webhook is properly configured",
      `Found ${automations.length} active automations`
    ]
    
    if (debug.issues.length === 0) {
      debug.recommendations.push("✅ Instagram configuration looks good! Check Cloudflare Worker is running.")
    }
    
    console.log(`✅ [${requestId}] Instagram debug completed`)
    
    return NextResponse.json({
      success: true,
      requestId,
      debug,
      summary: {
        accountsFound: instagramAccounts.length,
        issuesFound: debug.issues.length,
        activeAutomations: automations.length
      }
    })
    
  } catch (error) {
    console.error(`💥 [${requestId}] Instagram debug failed:`, error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 