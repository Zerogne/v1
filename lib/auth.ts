import { NextRequest } from "next/server"
import { prisma } from "./prisma"
import { Errors } from "@/src/shared/lib/errors"

/**
 * Get the current user ID from the request
 * Uses cookie-based authentication (userEmail cookie set on login)
 * Falls back to header-based auth for backward compatibility during migration
 * 
 * SECURITY: This function requires authentication - no fallback to default user
 */
export async function getUserId(request: NextRequest): Promise<string> {
  // Primary method: Get user email from secure cookie (set on login)
  const userEmail = request.cookies.get("userEmail")?.value
  
  if (userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })
    if (user) {
      return user.id
    }
  }

  // Fallback: Try to get user email from header (for backward compatibility during migration)
  // TODO: Remove this fallback once all clients are updated
  const headerEmail = request.headers.get("x-user-email")
  
  if (headerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: headerEmail },
      select: { id: true },
    })
    if (user) {
      return user.id
    }
  }

  // Try userId from header (for backward compatibility)
  const userId = request.headers.get("x-user-id")
  
  if (userId) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (user) {
      return userId
    }
  }

  // No authentication found - throw error instead of using fallback
  // This prevents unauthorized access
  throw Errors.unauthorized("Authentication required")
}

