import { createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { deleteSupabaseProject } from "@/src/shared/lib/supabase-provisioning"
import { Errors } from "@/src/shared/lib/errors"
import { z } from "zod"

const deleteSchema = z.object({
  projectId: z.string().min(1),
})

export const POST = createPostHandler(
  deleteSchema,
  async ({ request, body }) => {
    const projectId = body.projectId
    await requireProjectOwner(request, projectId)

    const result = await deleteSupabaseProject(projectId)

    if (!result.success) {
      throw Errors.badRequest(result.error || "Failed to delete Supabase project")
    }

    return {
      success: true,
      message: "Supabase project deleted successfully",
    }
  }
)

