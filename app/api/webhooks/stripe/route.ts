import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getEnv } from "@/lib/env-server"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  const env = getEnv()
  const body = await req.text()
  const signature = headers().get("stripe-signature") as string

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const stripe = getStripe()

  try {
    const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Handle successful payment
        if (session.metadata?.userId) {
          // Update user subscription status
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              // Update subscription details
            },
          })
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Handle subscription updates
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }
}
