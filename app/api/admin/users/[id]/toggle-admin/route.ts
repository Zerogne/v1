import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"

export const POST = createPostHandler(
  {},
  async ({ request, params }) => {
    const { userId: adminUserId } = await requireAdmin(request)
    const { id: targetUserId } = await params

    // Prevent self-demotion
    if (adminUserId === targetUserId) {
      throw Errors.badRequest("Cannot modify your own admin status")
    }

    // Get current user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isAdmin: true },
    })

    if (!targetUser) {
      throw Errors.notFound("User not found")
    }

    // Toggle admin status
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isAdmin: !targetUser.isAdmin,
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
      },
    })

    // Log action
    await logAdminAction(adminUserId, "toggle_admin", "USER", targetUserId, {
      newIsAdmin: updatedUser.isAdmin,
    })

    return {
      success: true,
      user: updatedUser,
    }
  }
)

