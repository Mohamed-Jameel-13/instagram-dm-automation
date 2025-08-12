import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    console.log("🔍 Identifying account for token:", accessToken.substring(0, 10) + "...")

    const results = {
      tokenPrefix: accessToken.substring(0, 10),
      accounts: [] as any[]
    }

    // Method 1: Try Facebook Graph API /me (for Business tokens)
    try {
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${accessToken}`)
      if (fbResponse.ok) {
        const fbData = await fbResponse.json()
        results.accounts.push({
          source: "facebook_me",
          id: fbData.id,
          username: fbData.username,
          account_type: fbData.account_type,
          note: "Direct Facebook/Business API response"
        })

        // If this works, try to get Pages and Instagram Business accounts
        try {
          const pagesResp = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
          if (pagesResp.ok) {
            const pages = await pagesResp.json()
            for (const page of pages.data || []) {
              try {
                const igResp = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
                if (igResp.ok) {
                  const igData = await igResp.json()
                  if (igData.instagram_business_account?.id) {
                    const igDetails = await fetch(`https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=id,username,account_type&access_token=${page.access_token}`)
                    if (igDetails.ok) {
                      const details = await igDetails.json()
                      results.accounts.push({
                        source: "business_instagram_via_page",
                        id: details.id,
                        username: details.username,
                        account_type: details.account_type,
                        pageId: page.id,
                        pageName: page.name,
                        note: "Instagram Business account linked to Facebook Page"
                      })
                    }
                  }
                }
              } catch (e) {
                console.warn("Could not get IG account for page", page.id)
              }
            }
          }
        } catch (e) {
          console.warn("Could not get pages")
        }
      }
    } catch (error) {
      console.log("Facebook Graph API failed:", error)
    }

    // Method 2: Try Instagram Graph API /me (for Basic Display tokens)
    try {
      const igResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
      if (igResponse.ok) {
        const igData = await igResponse.json()
        results.accounts.push({
          source: "instagram_me",
          id: igData.id,
          username: igData.username,
          account_type: "PERSONAL",
          note: "Basic Display API response"
        })
      }
    } catch (error) {
      console.log("Instagram Graph API failed:", error)
    }

    // Add analysis
    const analysis = {
      webhookAccountId: "17841473518392752",
      currentStoredAccountId: "24695355950081100",
      matchesWebhook: results.accounts.some(acc => acc.id === "17841473518392752"),
      matchesStored: results.accounts.some(acc => acc.id === "24695355950081100"),
      recommendation: ""
    }

    if (analysis.matchesWebhook) {
      analysis.recommendation = "✅ This token is for the correct account (matches webhook). Use this token to reconnect."
    } else if (analysis.matchesStored) {
      analysis.recommendation = "❌ This token is for the currently stored account, but doesn't match webhooks. You need a token for account 17841473518392752."
    } else {
      analysis.recommendation = "❌ This token is for a different account entirely. You need a token for the account that receives webhooks (17841473518392752)."
    }

    return NextResponse.json({
      success: true,
      results,
      analysis,
      summary: {
        tokenType: accessToken.startsWith('EAAC') ? 'Facebook Business' : 
                   accessToken.startsWith('IGQVJ') ? 'Instagram Basic Display' :
                   accessToken.startsWith('IGA') ? 'Instagram Basic Display' :
                   'Unknown',
        accountsFound: results.accounts.length,
        needsCorrectAccount: !analysis.matchesWebhook
      }
    })

  } catch (error) {
    console.error("Account identification error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
