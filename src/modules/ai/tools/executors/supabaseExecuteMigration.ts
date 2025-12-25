import "server-only"

import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"
import { z } from "zod"
import { runMigrations } from "@/src/shared/lib/supabase-migration-runner"

const executeMigrationSchema = z.object({
  path: z.string(),
})

/**
 * Execute a SQL migration on managed Supabase
 * Reads the migration file and executes it using the migration runner
 */
export async function supabaseExecuteMigration(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = executeMigrationSchema.parse(args)
    const { path } = validated

    // Get managed Supabase project
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
    })

    if (!managedProject) {
      return {
        ok: false,
        error: "Managed Supabase backend is not provisioned. Please create a backend first.",
      }
    }

    if (managedProject.status !== "READY") {
      return {
        ok: false,
        error: `Managed Supabase backend is not ready (status: ${managedProject.status})`,
      }
    }

    // Read migration file from project files
    const projectFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    })

    if (!projectFile) {
      return {
        ok: false,
        error: `Migration file not found: ${path}`,
      }
    }

    // Use path as name for better tracking (matches how createMigration works)
    const name = path

    // Execute migration using the migration runner
    const result = await runMigrations(managedProject.id, [
      {
        name,
        sql: projectFile.content,
      },
    ])

    if (result.success && result.applied > 0) {
      return {
        ok: true,
        message: `Migration ${path} executed successfully`,
      }
    } else if (result.failed > 0) {
      const errorMessages = result.errors.map((e) => e.error).join("; ")
      return {
        ok: false,
        error: `Failed to execute migration: ${errorMessages}`,
      }
    } else {
      // Migration was already applied (skipped)
      return {
        ok: true,
        message: `Migration ${path} was already applied`,
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      }
    }
    return {
      ok: false,
      error: "Unknown error executing migration",
    }
  }
}
