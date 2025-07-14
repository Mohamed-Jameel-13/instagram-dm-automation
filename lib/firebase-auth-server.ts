import { NextRequest } from 'next/server'

export interface FirebaseAuthUser {
  uid: string
  email?: string
  displayName?: string
}

/**
 * Extract Firebase Auth user from request
 * For now, this is a simple implementation that gets user ID from headers
 * In production, you should verify the Firebase ID token using Firebase Admin SDK
 */
export async function getFirebaseUserFromRequest(req: NextRequest): Promise<FirebaseAuthUser | null> {
  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    
    // For now, we'll extract user info from a custom header
    // In production, you should verify the Firebase ID token here
    const userInfo = req.headers.get('X-User-Info')
    
    if (userInfo) {
      try {
        return JSON.parse(userInfo) as FirebaseAuthUser
      } catch {
        return null
      }
    }

    // Fallback: return a mock user for development
    // TODO: Implement proper Firebase Admin SDK token verification
    return {
      uid: token.substring(0, 20), // Use part of token as user ID
      email: 'user@example.com',
      displayName: 'Firebase User'
    }
  } catch (error) {
    console.error('Error extracting Firebase user:', error)
    return null
  }
}

/**
 * Alternative: Get user ID from request body or query params
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  try {
    // First try to get from Firebase Auth
    const user = await getFirebaseUserFromRequest(req)
    if (user) {
      return user.uid
    }

    // Fallback: try to get from request body
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // Clone the request to avoid consuming the body
        const reqClone = req.clone()
        const body = await reqClone.json()
        if (body.userId) {
          return body.userId
        }
      } catch {
        // Body might not be JSON or already consumed
      }
    }

    // Fallback: try to get from query params
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    if (userId) {
      return userId
    }

    return null
  } catch (error) {
    console.error('Error getting user ID from request:', error)
    return null
  }
} 