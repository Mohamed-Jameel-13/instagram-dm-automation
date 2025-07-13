import { prisma } from "@/lib/db"

export interface InstagramUser {
  id: string
  username: string
}

export interface InstagramMessage {
  id: string
  text: string
  timestamp: string
  from: InstagramUser
  to: InstagramUser
}

export interface InstagramComment {
  id: string
  text: string
  timestamp: string
  from: InstagramUser
  media: {
    id: string
  }
}

export class InstagramAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Get the access token (for internal API use)
   */
  get token(): string {
    return this.accessToken
  }

  /**
   * Send a direct message to an Instagram user
   */
  async sendMessage(recipientId: string, message: string, pageId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.instagram.com/v18.0/${pageId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: message,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("Failed to send Instagram message:", error)
        return false
      }

      console.log("Instagram message sent successfully")
      return true
    } catch (error) {
      console.error("Error sending Instagram message:", error)
      return false
    }
  }

  /**
   * Reply to an Instagram comment
   */
  async replyToComment(commentId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.instagram.com/v18.0/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          message: message,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("Failed to reply to Instagram comment:", error)
        return false
      }

      console.log("Instagram comment reply sent successfully")
      return true
    } catch (error) {
      console.error("Error replying to Instagram comment:", error)
      return false
    }
  }

  /**
   * Get Instagram user profile information using Basic Display API
   */
  async getUserProfile(userId: string): Promise<InstagramUser | null> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        const error = await response.text()
        console.error("Failed to get Instagram user profile:", error)
        return null
      }

      const data = await response.json()
      return {
        id: data.id,
        username: data.username,
      }
    } catch (error) {
      console.error("Error getting Instagram user profile:", error)
      return null
    }
  }

  /**
   * Get recent media posts using Basic Display API
   */
  async getRecentMedia(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp&limit=${limit}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        const error = await response.text()
        console.error("Failed to get Instagram media:", error)
        return []
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error getting Instagram media:", error)
      return []
    }
  }

  /**
   * Subscribe to webhook events
   */
  async subscribeToWebhooks(pageId: string, callbackUrl: string, verifyToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/v18.0/${pageId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            subscribed_fields: ['messages', 'comments'],
            callback_url: callbackUrl,
            verify_token: verifyToken,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error("Failed to subscribe to Instagram webhooks:", error)
        return false
      }

      console.log("Successfully subscribed to Instagram webhooks")
      return true
    } catch (error) {
      console.error("Error subscribing to Instagram webhooks:", error)
      return false
    }
  }
}

/**
 * Get Instagram API instance for a user
 */
export async function getInstagramAPI(userId: string): Promise<InstagramAPI | null> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram",
      },
    })

    if (!account?.access_token) {
      console.error("No Instagram access token found for user:", userId)
      return null
    }

    return new InstagramAPI(account.access_token)
  } catch (error) {
    console.error("Error getting Instagram API instance:", error)
    return null
  }
}

/**
 * Validate Instagram webhook signature
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  return `sha256=${expectedSignature}` === signature
}

/**
 * Extract Instagram user ID from webhook event
 */
export function extractUserIdFromEvent(event: any): string | null {
  if (event.sender?.id) {
    return event.sender.id
  }
  
  if (event.from?.id) {
    return event.from.id
  }
  
  return null
}

/**
 * Check if message contains any of the trigger keywords
 */
export function hasMatchingKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase()
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
}
