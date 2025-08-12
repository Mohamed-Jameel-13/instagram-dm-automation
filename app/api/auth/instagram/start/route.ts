import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Prefer Facebook App ID for Instagram Graph (Business) OAuth
  const clientId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID
  const redirectUri = `${new URL(req.url).origin}/auth/callback/instagram`
  // Use Facebook Login for Instagram Business API permissions
  const scope = "instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement"

  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=Missing+INSTAGRAM_CLIENT_ID+or+FACEBOOK_APP_ID', req.url))
  }

  // Use Facebook's authorization endpoint for Instagram Business API
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', 'instagram_business_auth')

  return NextResponse.redirect(authUrl.toString())
}
