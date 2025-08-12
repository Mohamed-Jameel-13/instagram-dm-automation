import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Hard-code the Facebook App ID to test
  const hardcodedAppId = "2417473549489503";
  
  // Create direct URL to Facebook OAuth
  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", hardcodedAppId);
  authUrl.searchParams.set("redirect_uri", `${new URL(req.url).origin}/auth/callback/instagram`);
  authUrl.searchParams.set("scope", "instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", "direct_test");
  
  // Return both debug info and redirect
  return NextResponse.redirect(authUrl.toString());
}
