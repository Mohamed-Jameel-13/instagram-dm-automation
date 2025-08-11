import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envCheck = {
      hasInstagramClientSecret: !!process.env.INSTAGRAM_CLIENT_SECRET,
      hasWebhookVerifyToken: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
      hasAccessToken: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasBusinessAccountId: !!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
      clientSecretLength: process.env.INSTAGRAM_CLIENT_SECRET?.length || 0,
      verifyTokenLength: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.length || 0,
      accessTokenLength: process.env.INSTAGRAM_ACCESS_TOKEN?.length || 0,
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || 'NOT_SET',
      // Show first 20 chars for debugging (safe)
      clientSecretPrefix: process.env.INSTAGRAM_CLIENT_SECRET?.substring(0, 20) || 'NOT_SET',
      verifyTokenPrefix: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.substring(0, 20) || 'NOT_SET',
      accessTokenPrefix: process.env.INSTAGRAM_ACCESS_TOKEN?.substring(0, 20) || 'NOT_SET',
      // Show all environment variables starting with INSTAGRAM (for debugging)
      allInstagramEnvs: Object.keys(process.env).filter(key => key.startsWith('INSTAGRAM'))
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
