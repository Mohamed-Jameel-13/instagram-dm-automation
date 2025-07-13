import Stripe from "stripe"
import { getEnv } from "./env-server"

export function getStripe() {
  const env = getEnv()
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    typescript: true,
  })
}
