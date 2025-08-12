import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID
  const redirectUri = `${new URL(req.url).origin}/auth/callback/instagram`
  const scope = "user_profile,user_media,instagram_manage_comments,instagram_manage_messages"

  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=Missing+INSTAGRAM_CLIENT_ID', req.url))
  }

  const authUrl = new URL('https://api.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
