import { prisma } from "@/lib/db"

/**
 * Ensures a user exists in the database with the given ID
 * This is needed because Firebase Auth users don't automatically exist in our database
 */
export async function ensureUserExists(userId: string, displayName?: string): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // Don't update if exists
      create: {
        id: userId,
        email: `${userId}@firebase.user`, // Placeholder email
        name: displayName || "Firebase User", // Use provided name or default
      },
    })
  } catch (error) {
    console.error("Error ensuring user exists:", error)
    throw error
  }
} 