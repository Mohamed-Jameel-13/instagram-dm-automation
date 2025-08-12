import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      INSTAGRAM_CLIENT_ID: !!process.env.INSTAGRAM_CLIENT_ID,
      FACEBOOK_APP_ID: !!process.env.FACEBOOK_APP_ID,
      FACEBOOK_APP_SECRET: !!process.env.FACEBOOK_APP_SECRET,
    },
    oauth: {
      instagramClientIdPrefix: process.env.INSTAGRAM_CLIENT_ID?.substring(0, 10) || 'NOT_SET',
      facebookAppIdPrefix: process.env.FACEBOOK_APP_ID?.substring(0, 10) || 'NOT_SET',
      instagramClientIdLength: process.env.INSTAGRAM_CLIENT_ID?.length || 0,
      facebookAppIdLength: process.env.FACEBOOK_APP_ID?.length || 0,
      effectiveClientId: (process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID)?.substring(0, 10) || 'NOT_SET',
      expectedAppId: '2417473549',
      redirectUri: `${new URL(req.url).origin}/auth/callback/instagram`,
    }
  };
  return NextResponse.json(diagnostics, { status: 200 });
}
