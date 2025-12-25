import { NextRequest } from "next/server"
import { prisma } from "./prisma"

/**
 * Get the current user ID from the request
 * For now, this uses a header or defaults to the migration user
 * TODO: Replace with proper session-based authentication
 */
export async function getUserId(request: NextRequest): Promise<string> {
  // Try to get userId from header (sent from frontend)
  const userId = request.headers.get("x-user-id")
  
  if (userId) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    if (user) {
      return userId
    }
  }

  // Try to get user email from header and look up user
  const userEmail = request.headers.get("x-user-email")
  
  if (userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })
    if (user) {
      return user.id
    }
  }

  // Fallback: Use the default migration user for now
  // TODO: Remove this once proper authentication is implemented
  const defaultUserId = "default-user-migration"
  
  // Check if default user exists, if not create it
  let defaultUser = await prisma.user.findUnique({
    where: { id: defaultUserId },
  })

  if (!defaultUser) {
    try {
      defaultUser = await prisma.user.create({
        data: {
          id: defaultUserId,
          email: "migration@example.com",
          name: "Migration User",
          password: "placeholder-password-hash",
        },
      })
    } catch (error) {
      // User might have been created by another request, try to find it again
      defaultUser = await prisma.user.findUnique({
        where: { id: defaultUserId },
      })
      if (!defaultUser) {
        throw new Error("Failed to get or create default user")
      }
    }
  }

  return defaultUserId
}

