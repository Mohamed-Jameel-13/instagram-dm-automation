// Firebase Auth types
export interface FirebaseUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
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