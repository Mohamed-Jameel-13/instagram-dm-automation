import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/integrations?error=No code provided', req.url))
  }

  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.redirect(new URL('/login?error=Unauthorized', req.url))
  }

  try {
    const redirectUri = `${new URL(req.url).origin}/auth/callback/instagram`
    
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      })
    })

    if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("Error getting access token:", errorData);
        return NextResponse.redirect(new URL(`/integrations?error=${errorData.error_message}`, req.url));
    }

    const { access_token, user_id } = await tokenResponse.json()

    const userResponse = await fetch(`https://graph.instagram.com/${user_id}?fields=id,username&access_token=${access_token}`)
    const { username } = await userResponse.json()

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'instagram',
          providerAccountId: user_id,
        },
      },
      update: {
        access_token: access_token,
      },
      create: {
        userId: userId,
        type: 'oauth',
        provider: 'instagram',
        providerAccountId: user_id,
        access_token: access_token,
        token_type: 'bearer',
        scope: 'user_profile,user_media,instagram_manage_comments,instagram_manage_messages',
      },
    })

    return NextResponse.redirect(new URL('/integrations', req.url))
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL('/integrations?error=An unexpected error occurred', req.url))
  }
}
