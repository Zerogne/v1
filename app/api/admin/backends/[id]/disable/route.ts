import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"
import { SupabaseBackendStatus } from "@/lib/generated/prisma/enums"

export const POST = createPostHandler(
  {},
  async ({ request, params }) => {
    const { userId: adminUserId } = await requireAdmin(request)
    const { id: backendId } = await params

    const backend = await prisma.managedSupabaseProject.findUnique({
      where: { id: backendId },
    })

    if (!backend) {
      throw Errors.notFound("Backend not found")
    }

    // Update status to ERROR (effectively disabled)
    const updated = await prisma.managedSupabaseProject.update({
      where: { id: backendId },
      data: {
        status: "ERROR" as SupabaseBackendStatus,
        errorMessage: "Disabled by admin",
      },
    })

    // Log action
    await logAdminAction(adminUserId, "disable_backend", "BACKEND", backendId, {
      previousStatus: backend.status,
    })

    return {
      success: true,
      backend: updated,
    }
  }
)

