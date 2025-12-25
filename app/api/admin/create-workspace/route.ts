import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { WorkspaceMemberRole } from "@/lib/generated/prisma/enums"

const requestSchema = z.object({
  name: z.string().min(1),
  userId: z.string().optional(), // If not provided, uses current user
  seatCount: z.number().int().positive().default(1),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body }) => {
    const { userId: adminUserId } = await requireAdmin(request)
    const currentUserId = adminUserId
    const ownerId = body.userId || currentUserId

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        ownerId,
        seatCount: body.seatCount,
      },
    })

    // Add owner as workspace member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: ownerId,
        role: "OWNER" as WorkspaceMemberRole,
      },
    })

    // Log action
    await logAdminAction(adminUserId, "create_workspace", "WORKSPACE", workspace.id, {
      name: body.name,
      seatCount: body.seatCount,
    })

    return {
      success: true,
      workspace,
    }
  }
)

