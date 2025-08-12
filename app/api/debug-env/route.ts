import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Create a test URL to see what's happening
  const testAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  
  // Force use Facebook App ID directly
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  testAuthUrl.searchParams.set("client_id", facebookAppId || "MISSING");
  testAuthUrl.searchParams.set("redirect_uri", `${new URL(req.url).origin}/auth/callback/instagram`);
  testAuthUrl.searchParams.set("scope", "instagram_basic,instagram_manage_comments");
  testAuthUrl.searchParams.set("response_type", "code");
  
  // Debug info
  const envVars = {
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    INSTAGRAM_CLIENT_SECRET_EXISTS: !!process.env.INSTAGRAM_CLIENT_SECRET,
    FACEBOOK_APP_SECRET_EXISTS: !!process.env.FACEBOOK_APP_SECRET,
  };
  
  return NextResponse.json({
    envVars,
    generatedUrl: testAuthUrl.toString(),
    directLink: testAuthUrl.toString(),
    instructions: "Click the directLink to test OAuth with the Facebook App ID directly"
  });
}
