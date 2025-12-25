import "server-only"

import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"
import { z } from "zod"
import { makeMigrationPath } from "@/src/shared/lib/supabase-helpers"
import { createFile } from "./createFile"
import { runMigrations } from "@/src/shared/lib/supabase-migration-runner"

const createMigrationSchema = z.object({
  title: z.string().min(1),
  sql: z.string().min(1).max(100_000, "SQL too large (max 100,000 chars)"),
  notes: z.string().optional(),
})

/**
 * Create and automatically execute a SQL migration on managed Supabase
 * Uses direct PostgreSQL connection with safety guardrails
 */
export async function supabaseCreateMigration(
  projectId: string,
  args: unknown
): Promise<ToolResult & { path?: string }> {
  try {
    const validated = createMigrationSchema.parse(args)
    const { title, sql, notes } = validated
    
    // Check if managed Supabase project exists and is ready
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
    })

    if (!managedProject) {
      return {
        ok: false,
        error: "Managed Supabase backend is not provisioned. Please create a backend first using the Supabase button in the project toolbar.",
      }
    }

    if (managedProject.status !== "READY") {
      return {
        ok: false,
        error: `Managed Supabase backend is not ready (status: ${managedProject.status}). Please wait for provisioning to complete.`,
      }
    }
    
    // Generate migration path
    const path = makeMigrationPath(title)
    
    // Build SQL content (add notes as comments if provided)
    let sqlContent = sql
    if (notes) {
      sqlContent = `-- ${notes}\n\n${sqlContent}`
    }
    
    // Create file using existing createFile tool
    const fileResult = await createFile(projectId, {
      path,
      content: sqlContent,
      language: "sql",
    })
    
    if (!fileResult.ok) {
      return fileResult
    }
    
    // Execute migration using the migration runner
    try {
      const migrationResult = await runMigrations(managedProject.id, [
        {
          name: path, // Use path as name for better tracking
          sql: sqlContent,
        },
      ])

      if (migrationResult.success && migrationResult.applied > 0) {
        return {
          ok: true,
          path,
          message: `Migration created and executed successfully: ${path}. The SQL has been automatically applied to your Supabase database.`,
        }
      } else if (migrationResult.failed > 0) {
        const errorMessages = migrationResult.errors.map((e) => `${e.name}: ${e.error}`).join("; ")
        return {
          ok: false, // Return false since execution failed
          error: `Migration created but execution failed: ${errorMessages}. Please review the SQL and fix any errors.`,
        }
      } else {
        // All migrations were already applied (skipped)
        return {
          ok: true,
          path,
          message: `Migration created: ${path}. This migration was already applied previously.`,
        }
      }
    } catch (error) {
      // If execution fails, still return the file was created but mark it as failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error(`[Migration] Failed to execute migration ${path}:`, error)
      
      return {
        ok: false,
        error: `Migration file created but execution failed: ${errorMessage}. The migration file is saved at ${path}. Please review and execute manually if needed.`,
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
      error: "Unknown error creating migration",
    }
  }
}
