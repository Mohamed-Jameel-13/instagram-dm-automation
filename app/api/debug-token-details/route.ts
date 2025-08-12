import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    console.log("🔍 Debugging token:", accessToken.substring(0, 10) + "...")

    const results = {
      tokenPrefix: accessToken.substring(0, 10),
      tests: {} as any
    }

    // Test 1: Facebook Graph API /me
    try {
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${accessToken}`)
      results.tests.facebook_me = {
        status: fbResponse.status,
        ok: fbResponse.ok,
        data: fbResponse.ok ? await fbResponse.json() : await fbResponse.text()
      }
    } catch (error) {
      results.tests.facebook_me = { error: error instanceof Error ? error.message : String(error) }
    }

    // Test 2: Instagram Graph API /me
    try {
      const igResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
      results.tests.instagram_me = {
        status: igResponse.status,
        ok: igResponse.ok,
        data: igResponse.ok ? await igResponse.json() : await igResponse.text()
      }
    } catch (error) {
      results.tests.instagram_me = { error: error instanceof Error ? error.message : String(error) }
    }

    // Test 3: Facebook /me/accounts (for Business account resolution)
    try {
      const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
      results.tests.facebook_accounts = {
        status: accountsResponse.status,
        ok: accountsResponse.ok,
        data: accountsResponse.ok ? await accountsResponse.json() : await accountsResponse.text()
      }
    } catch (error) {
      results.tests.facebook_accounts = { error: error instanceof Error ? error.message : String(error) }
    }

    // Test 4: Try to determine which endpoint works
    let workingEndpoint = null
    let accountData = null

    if (results.tests.facebook_me.ok) {
      workingEndpoint = "facebook_me"
      accountData = results.tests.facebook_me.data
    } else if (results.tests.instagram_me.ok) {
      workingEndpoint = "instagram_me"  
      accountData = results.tests.instagram_me.data
    }

    results.conclusion = {
      workingEndpoint,
      accountData,
      tokenType: accessToken.startsWith('EAAC') ? 'facebook_business' : 
                 accessToken.startsWith('IGQVJ') ? 'instagram_basic_display' :
                 accessToken.startsWith('IGA') ? 'instagram_basic_display_v2' :
                 'unknown',
      recommendation: workingEndpoint === 'instagram_me' ? 
        'This is a Basic Display token - it will use the Instagram user ID directly, not resolve to Business account' :
        'This appears to be a Business token - should resolve to correct Business account ID'
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error("Debug token error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
