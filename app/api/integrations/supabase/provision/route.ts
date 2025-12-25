import { createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { provisionSupabaseProject } from "@/src/shared/lib/supabase-provisioning"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"
import { getEffectivePlanForUser, canCreateBackend } from "@/lib/entitlements"
import { z } from "zod"

const provisionSchema = z.object({
  projectId: z.string().min(1),
})

export const POST = createPostHandler(
  provisionSchema,
  async ({ request, body }) => {
    const projectId = body.projectId
    const { userId } = await requireProjectOwner(request, projectId)

    // Check entitlements
    const effectivePlan = await getEffectivePlanForUser(userId)

    // Get project name
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    })

    if (!project) {
      throw Errors.notFound("Project not found")
    }

    // Check backend quota (all tiers can create backends now)
    const quotaCheck = await canCreateBackend(effectivePlan.ownerType, effectivePlan.ownerId)
    if (!quotaCheck.allowed) {
      throw Errors.forbidden(quotaCheck.reason || "Backend quota exceeded")
    }
    const result = await provisionSupabaseProject({
      projectId,
      userId,
      projectName: project.name,
      ownerType: effectivePlan.ownerType,
      ownerId: effectivePlan.ownerId,
    })

    if (!result.success) {
      throw Errors.badRequest(result.error || "Failed to provision Supabase project")
    }

    return {
      success: true,
      managedSupabaseProjectId: result.managedSupabaseProjectId,
      message: "Supabase project provisioning started",
    }
  }
)

