import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"
import { z } from "zod"
import { createHash } from "crypto"

const isMigrationAppliedSchema = z.object({
  path: z.string(),
})

/**
 * Generate hash of SQL for deduplication (same as in migration runner)
 */
function hashSQL(sql: string): string {
  return createHash("sha256").update(sql).digest("hex")
}

export async function supabaseIsMigrationApplied(
  projectId: string,
  args: unknown
): Promise<ToolResult & { applied?: boolean }> {
  try {
    const validated = isMigrationAppliedSchema.parse(args)
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

    // Get migration file
    const migrationFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    })

    if (!migrationFile) {
      return {
        ok: false,
        error: `Migration file not found: ${path}`,
      }
    }

    // Generate hash from file content
    const hash = hashSQL(migrationFile.content)

    // Check if migration is applied
    const appliedMigration = await prisma.managedSupabaseMigration.findUnique({
      where: {
        managedSupabaseProjectId_hash: {
          managedSupabaseProjectId: managedProject.id,
          hash,
        },
      },
      select: {
        status: true,
      },
    })
    
    const applied = appliedMigration?.status === "applied"
    
    return {
      ok: true,
      applied,
      message: `Migration ${path} is ${applied ? "applied" : "not applied"}`,
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
      error: "Unknown error checking migration status",
    }
  }
}

