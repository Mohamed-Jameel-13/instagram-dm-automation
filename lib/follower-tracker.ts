import { prisma } from "@/lib/db"

export interface InstagramFollower {
  id: string
  username: string
}

export class FollowerTracker {
  
  /**
   * Fetch current followers from Instagram API
   */
  async fetchInstagramFollowers(accessToken: string, instagramUserId: string): Promise<InstagramFollower[]> {
    try {
      console.log(`Fetching followers for Instagram user: ${instagramUserId}`)
      
      // Instagram Graph API endpoint for followers
      const url = `https://graph.instagram.com/v18.0/${instagramUserId}/followers?fields=id,username&access_token=${accessToken}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Error fetching Instagram followers:", data)
        throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`)
      }
      
      return data.data || []
    } catch (error) {
      console.error("Error fetching Instagram followers:", error)
      throw error
    }
  }
  
  /**
   * Sync followers and detect new ones
   */
  async syncFollowers(userId: string): Promise<{ newFollowers: InstagramFollower[], totalFollowers: number }> {
    try {
      console.log(`Syncing followers for user: ${userId}`)
      
      // Get user's Instagram account
      const instagramAccount = await prisma.account.findFirst({
        where: {
          userId: userId,
          provider: "instagram",
        },
      })
      
      if (!instagramAccount?.access_token) {
        throw new Error("No Instagram access token found for user")
      }
      
      // Fetch current followers from Instagram
      const currentFollowers = await this.fetchInstagramFollowers(
        instagramAccount.access_token,
        instagramAccount.providerAccountId
      )
      
      console.log(`Found ${currentFollowers.length} current followers`)
      
      // Get existing followers from database
      const existingFollowers = await prisma.follower.findMany({
        where: { userId },
        select: { followerId: true, followerUsername: true }
      })
      
      const existingFollowerIds = new Set(existingFollowers.map(f => f.followerId))
      console.log(`Found ${existingFollowers.length} existing followers in database`)
      
      // Identify new followers
      const newFollowers = currentFollowers.filter(follower => 
        !existingFollowerIds.has(follower.id)
      )
      
      console.log(`Identified ${newFollowers.length} new followers`)
      
      // Add new followers to database
      if (newFollowers.length > 0) {
        await prisma.follower.createMany({
          data: newFollowers.map(follower => ({
            userId,
            followerId: follower.id,
            followerUsername: follower.username,
            isNew: true,
            followedAt: new Date(),
          })),
          skipDuplicates: true,
        })
        
        console.log(`Added ${newFollowers.length} new followers to database`)
      }
      
      // Mark existing followers as not new (they've been processed)
      await prisma.follower.updateMany({
        where: {
          userId,
          followerId: { in: currentFollowers.map(f => f.id) },
          isNew: true,
        },
        data: { isNew: false },
      })
      
      // Remove unfollowed users from database
      const currentFollowerIds = new Set(currentFollowers.map(f => f.id))
      const unfollowedUsers = existingFollowers.filter(f => !currentFollowerIds.has(f.followerId))
      
      if (unfollowedUsers.length > 0) {
        await prisma.follower.deleteMany({
          where: {
            userId,
            followerId: { in: unfollowedUsers.map(f => f.followerId) }
          }
        })
        
        console.log(`Removed ${unfollowedUsers.length} unfollowed users from database`)
      }
      
      return {
        newFollowers,
        totalFollowers: currentFollowers.length,
      }
      
    } catch (error) {
      console.error("Error syncing followers:", error)
      throw error
    }
  }
  
  /**
   * Check if a user is a new follower
   */
  async isNewFollower(userId: string, followerId: string): Promise<boolean> {
    try {
      const follower = await prisma.follower.findUnique({
        where: {
          userId_followerId: {
            userId,
            followerId,
          },
        },
        select: { isNew: true, followedAt: true },
      })
      
      // If user is in database and marked as new or recent follower, return true
      if (follower) {
        const isRecentFollower = follower.followedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
        return follower.isNew || isRecentFollower
      }
      
      // If user is not in database, they might have just followed
      // Check if they're currently following by syncing followers
      console.log(`User ${followerId} not found in database, checking if they're a new follower by syncing...`)
      
      try {
        await this.syncFollowers(userId)
        
        // Check again after sync
        const updatedFollower = await prisma.follower.findUnique({
          where: {
            userId_followerId: {
              userId,
              followerId,
            },
          },
          select: { isNew: true, followedAt: true },
        })
        
        if (updatedFollower) {
          const isRecentFollower = updatedFollower.followedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
          return updatedFollower.isNew || isRecentFollower
        }
        
        return false
      } catch (syncError) {
        console.error("Error syncing followers during new follower check:", syncError)
        return false
      }
      
    } catch (error) {
      console.error("Error checking if user is new follower:", error)
      return false
    }
  }
  
  /**
   * Mark a follower as having commented (for tracking engagement)
   */
  async markFollowerCommented(userId: string, followerId: string): Promise<void> {
    try {
      await prisma.follower.updateMany({
        where: {
          userId,
          followerId,
        },
        data: {
          lastCommentAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Error marking follower as commented:", error)
    }
  }
  
  /**
   * Get follower statistics
   */
  async getFollowerStats(userId: string): Promise<{
    totalFollowers: number
    newFollowers: number
    recentCommenters: number
  }> {
    try {
      const [totalFollowers, newFollowers, recentCommenters] = await Promise.all([
        prisma.follower.count({
          where: { userId },
        }),
        prisma.follower.count({
          where: { userId, isNew: true },
        }),
        prisma.follower.count({
          where: {
            userId,
            lastCommentAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ])
      
      return {
        totalFollowers,
        newFollowers,
        recentCommenters,
      }
    } catch (error) {
      console.error("Error getting follower stats:", error)
      throw error
    }
  }
}

export const followerTracker = new FollowerTracker() 