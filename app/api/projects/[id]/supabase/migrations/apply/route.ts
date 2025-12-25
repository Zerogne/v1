import { createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { applyMigrationSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"
import { runMigrations } from "@/src/shared/lib/supabase-migration-runner"

export const POST = createPostHandler(
  applyMigrationSchema,
  async ({ request, body, params }) => {
    const { id: projectId } = await params
    await requireProjectOwner(request, projectId)
    
    // Get managed Supabase project
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
    })

    if (!managedProject) {
      throw Errors.notFound("Managed Supabase project")
    }

    if (managedProject.status !== "READY") {
      throw Errors.badRequest(`Supabase project is not ready (status: ${managedProject.status})`)
    }
    
    // Get migration file
    const migrationFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: body.path,
        },
      },
    })
    
    if (!migrationFile) {
      throw Errors.notFound("Migration file", body.path)
    }
    
    // Execute the migration
    const result = await runMigrations(managedProject.id, [
      {
        name: body.path,
        sql: migrationFile.content,
      },
    ])
    
    if (!result.success || result.failed > 0) {
      const errorMessages = result.errors.map((e) => `${e.name}: ${e.error}`).join("; ")
      throw Errors.badRequest(`Migration execution failed: ${errorMessages}`)
    }
    
    // Post system message to chat if provided
    if (body.chatSessionId) {
      // Verify chat belongs to project
      const chat = await prisma.chatSession.findFirst({
        where: {
          id: body.chatSessionId,
          projectId,
        },
      })
      
      if (chat) {
        await prisma.chatMessage.create({
          data: {
            chatSessionId: body.chatSessionId,
            role: "system",
            content: `✅ Migration applied: ${body.path}. You can continue.`,
          },
        })
      }
    }
    
    // Get the applied migration record
    const appliedMigration = await prisma.managedSupabaseMigration.findFirst({
      where: {
        managedSupabaseProjectId: managedProject.id,
        name: body.path,
        status: "applied",
      },
      orderBy: {
        appliedAt: "desc",
      },
    })
    
    return {
      path: body.path,
      status: "applied",
      appliedAt: appliedMigration?.appliedAt || new Date(),
    }
  }
)

