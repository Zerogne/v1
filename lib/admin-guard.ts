import { NextRequest } from "next/server"
import { getUserId } from "./auth"
import { prisma } from "./prisma"
import { Errors } from "@/src/shared/lib/errors"

/**
 * Require admin access
 * Checks:
 * 1. User is authenticated
 * 2. User has isAdmin = true
 * 3. OR emergency ADMIN_SECRET header override (for dev/emergencies)
 */
export async function requireAdmin(request: NextRequest): Promise<{ userId: string; isSecretOverride: boolean }> {
  // Check emergency ADMIN_SECRET override first
  const adminSecret = process.env.ADMIN_SECRET
  const secretHeader = request.headers.get("x-admin-secret")
  
  if (adminSecret && secretHeader === adminSecret) {
    // Secret override - get userId normally but mark as secret override
    const userId = await getUserId(request)
    return { userId, isSecretOverride: true }
  }

  // Normal admin check: user must have isAdmin = true
  const userId = await getUserId(request)
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user || !user.isAdmin) {
    throw Errors.forbidden("Admin access required")
  }

  return { userId, isSecretOverride: false }
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, any>
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        metaJson: meta || null,
      },
    })
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Failed to log admin action:", error)
  }
}

