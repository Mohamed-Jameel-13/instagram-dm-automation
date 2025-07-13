import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      accounts?: {
        provider: string
        id: string
      }[]
    } & DefaultSession["user"]
  }
}

export interface InstagramAccount {
  id: string
  provider: string
  username?: string
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

export interface UserProfile {
  id: string
  name?: string
  email: string
  image?: string
  accounts: InstagramAccount[]
} 