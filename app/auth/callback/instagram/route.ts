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
    
    // Exchange code for Facebook access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    // Prefer Facebook App credentials for IG Graph OAuth
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenFetch = await fetch(tokenUrl.toString())

    if (!tokenFetch.ok) {
        const errorData = await tokenFetch.text();
        console.error("Error getting access token:", errorData);
        return NextResponse.redirect(new URL(`/integrations?error=Token+exchange+failed`, req.url));
    }

    const { access_token } = await tokenFetch.json()

    // Get user's Facebook pages (which include Instagram Business accounts)
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`)
    const pagesData = await pagesResponse.json()

    // Find Instagram Business account
    let instagramAccount = null
    for (const page of pagesData.data || []) {
      const igResponse = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
      const igData = await igResponse.json()
      
      if (igData.instagram_business_account) {
        // Get Instagram account details
        const igDetailsResponse = await fetch(`https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=id,username&access_token=${page.access_token}`)
        const igDetails = await igDetailsResponse.json()
        
        instagramAccount = {
          id: igDetails.id,
          username: igDetails.username,
          access_token: page.access_token
        }
        break
      }
    }

    if (!instagramAccount) {
      return NextResponse.redirect(new URL('/integrations?error=No+Instagram+Business+account+found', req.url))
    }

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'instagram',
          providerAccountId: instagramAccount.id,
        },
      },
      update: {
        access_token: instagramAccount.access_token,
      },
      create: {
        userId: userId,
        type: 'oauth',
        provider: 'instagram',
        providerAccountId: instagramAccount.id,
        access_token: instagramAccount.access_token,
        token_type: 'bearer',
        scope: 'instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement',
      },
    })

    return NextResponse.redirect(new URL('/integrations', req.url))
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL('/integrations?error=An unexpected error occurred', req.url))
  }
}
