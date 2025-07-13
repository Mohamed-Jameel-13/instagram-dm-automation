import { z } from "zod"

const envSchema = z.object({
  // Firebase Configuration  
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),

  // Database
  DATABASE_URL: z.string().min(1),

  // Azure OpenAI Services
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),

  // Instagram OAuth (optional - only needed for OAuth flow)
  INSTAGRAM_CLIENT_ID: z.string().min(1).optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().min(1).optional(),

  // Instagram Webhooks
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  INSTAGRAM_WEBHOOK_SECRET: z.string().min(1),

  // Instagram Access Token (optional - only needed for manual token method)
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// For client-side env variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
})

// Function to validate server-side environment variables
export function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:", JSON.stringify(error.format(), null, 4))
    } else {
      console.error("❌ Environment validation error:", error)
    }
    throw new Error("Invalid environment variables")
  }
}

// For client-side usage
export const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate client environment variables
try {
  clientEnvSchema.parse(clientEnv)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid client environment variables:", JSON.stringify(error.format(), null, 4))
  } else {
    console.error("❌ Client environment validation error:", error)
  }
  throw new Error("Invalid client environment variables")
}
