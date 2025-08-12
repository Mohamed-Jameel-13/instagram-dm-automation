import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      INSTAGRAM_CLIENT_SECRET: !!process.env.INSTAGRAM_CLIENT_SECRET,
      INSTAGRAM_WEBHOOK_VERIFY_TOKEN: !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
      REDIS_URL: !!process.env.REDIS_URL,
      REDIS_TOKEN: !!process.env.REDIS_TOKEN,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    },
    headers: {},
  };

  return NextResponse.json(diagnostics);
}
