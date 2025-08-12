import { type NextRequest, NextResponse } from "next/server"

// Single route that posts a realistic IG webhook payload to our webhook handler.
// Accepts optional overrides via request body.
export async function POST(req: NextRequest) {
  try {
    const overrides = await req.json().catch(() => ({} as any))

    const instagramAccountId = overrides.instagramAccountId || "24695355950081100"
    const text = overrides.text || "hello"
    const commenterId = overrides.commenterId || "test_user_123456"
    const mediaId = overrides.mediaId || "test_post_789"

    const webhookPayload = {
      object: "instagram",
      entry: [
        {
          id: instagramAccountId,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "comments",
              value: {
                id: `test_comment_${Date.now()}`,
                text,
                from: { id: commenterId, username: "testuser" },
                media: { id: mediaId, media_product_type: "FEED" },
                created_time: new Date().toISOString(),
                parent_id: null,
              },
            },
          ],
        },
      ],
    }

    const webhookUrl = `${req.nextUrl.origin}/api/webhooks/instagram`
    const testSignature = "sha256=test_signature_for_testing"

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": testSignature,
      },
      body: JSON.stringify(webhookPayload),
    })

    const result = await response.json().catch(() => ({}))

    return NextResponse.json({
      success: true,
      webhookPayload,
      webhookResponse: result,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}