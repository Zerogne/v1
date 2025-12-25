import { createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { runMigrations } from "@/src/shared/lib/supabase-migration-runner"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"
import { z } from "zod"

const migrateSchema = z.object({
  projectId: z.string().min(1),
  migrations: z.array(
    z.object({
      name: z.string().min(1),
      sql: z.string().min(1),
    })
  ),
})

export const POST = createPostHandler(
  migrateSchema,
  async ({ request, body }) => {
    const projectId = body.projectId
    await requireProjectOwner(request, projectId)

    // Get managed Supabase project
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
    })

    if (!managedProject) {
      throw Errors.notFound("Managed Supabase project not found. Please provision a backend first.")
    }

    if (managedProject.status !== "READY") {
      throw Errors.badRequest(
        `Supabase project is not ready (status: ${managedProject.status})`
      )
    }

    // Run migrations
    const result = await runMigrations(managedProject.id, body.migrations)

    return {
      success: result.success,
      applied: result.applied,
      failed: result.failed,
      errors: result.errors,
    }
  }
)

