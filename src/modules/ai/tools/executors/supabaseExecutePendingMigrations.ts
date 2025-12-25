import "server-only"

import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"
import { runMigrations } from "@/src/shared/lib/supabase-migration-runner"

/**
 * Execute all pending migrations for a project
 * This automatically runs all migrations that haven't been applied yet
 */
export async function supabaseExecutePendingMigrations(
  projectId: string,
  _args: unknown
): Promise<ToolResult & { executed?: number; failed?: number; details?: Array<{ name: string; status: string; error?: string }> }> {
  try {
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

    // Get all migration files
    const migrationFiles = await prisma.projectFile.findMany({
      where: {
        projectId,
        path: {
          startsWith: "supabase/migrations/",
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc", // Execute in creation order
      },
    })

    if (migrationFiles.length === 0) {
      return {
        ok: true,
        executed: 0,
        failed: 0,
        message: "No migration files found",
      }
    }

    // Get all migration records (applied, failed, pending)
    const allMigrationRecords = await prisma.managedSupabaseMigration.findMany({
      where: {
        managedSupabaseProjectId: managedProject.id,
      },
      select: {
        name: true,
        status: true,
        hash: true,
      },
    })

    // Create a map of applied migrations by name/path
    const appliedMap = new Map(
      allMigrationRecords
        .filter((m) => m.status === "applied")
        .map((m) => [m.name, m])
    )

    // Helper to check if a migration is applied
    const isMigrationApplied = (filePath: string): boolean => {
      // Direct match
      if (appliedMap.has(filePath)) {
        return true
      }
      
      // Try matching by filename (last part of path)
      const fileName = filePath.split("/").pop() || ""
      for (const [appliedName] of appliedMap) {
        const appliedFileName = appliedName.split("/").pop() || ""
        if (appliedFileName === fileName || 
            appliedName === filePath ||
            appliedName.includes(fileName) ||
            filePath.includes(appliedFileName)) {
          return true
        }
      }
      
      return false
    }

    // Filter to only pending migrations (not applied)
    const pendingMigrations = migrationFiles.filter((file) => {
      return !isMigrationApplied(file.path)
    })

    if (pendingMigrations.length === 0) {
      return {
        ok: true,
        executed: 0,
        failed: 0,
        message: "All migrations are already applied",
      }
    }

    // Prepare migrations for execution
    const migrationsToExecute = pendingMigrations.map((file) => ({
      name: file.path,
      sql: file.content,
    }))

    // Execute all pending migrations
    const result = await runMigrations(managedProject.id, migrationsToExecute)

    // Build details array
    const details = pendingMigrations.map((file, index) => {
      if (index < result.applied) {
        return {
          name: file.path,
          status: "applied",
        }
      } else if (index < result.applied + result.failed) {
        const errorIndex = index - result.applied
        return {
          name: file.path,
          status: "failed",
          error: result.errors[errorIndex]?.error || "Unknown error",
        }
      } else {
        return {
          name: file.path,
          status: "skipped",
        }
      }
    })

    if (result.success && result.failed === 0) {
      return {
        ok: true,
        executed: result.applied,
        failed: result.failed,
        details,
        message: `Successfully executed ${result.applied} pending migration(s)`,
      }
    } else if (result.failed > 0) {
      const errorMessages = result.errors.map((e) => `${e.name}: ${e.error}`).join("; ")
      return {
        ok: false,
        executed: result.applied,
        failed: result.failed,
        details,
        error: `Executed ${result.applied} migration(s), but ${result.failed} failed: ${errorMessages}`,
      }
    } else {
      return {
        ok: true,
        executed: result.applied,
        failed: result.failed,
        details,
        message: `All migrations were already applied or skipped`,
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
      error: "Unknown error executing pending migrations",
    }
  }
}

