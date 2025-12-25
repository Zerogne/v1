import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"

export async function supabaseListMigrations(
  projectId: string,
  _args: unknown
): Promise<ToolResult & { migrations?: Array<{ name: string; status: string; createdAt: Date; appliedAt: Date | null }> }> {
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

    // Get migrations from project files
    const migrationFiles = await prisma.projectFile.findMany({
      where: {
        projectId,
        path: {
          startsWith: "supabase/migrations/",
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        path: true,
        createdAt: true,
      },
    })

    // Get applied migrations from managed migrations
    const appliedMigrations = await prisma.managedSupabaseMigration.findMany({
      where: {
        managedSupabaseProjectId: managedProject.id,
      },
      select: {
        name: true,
        status: true,
        createdAt: true,
        appliedAt: true,
      },
    })

    // Create a map of applied migrations by name
    const appliedMap = new Map(
      appliedMigrations.map((m) => [m.name, m])
    )

    // Combine file info with applied status
    const migrations = migrationFiles.map((file) => {
      const name = file.path.split("/").pop()?.replace(".sql", "") || file.path
      const applied = appliedMap.get(name)
      
      return {
        name: file.path,
        status: applied?.status || "pending",
        createdAt: file.createdAt,
        appliedAt: applied?.appliedAt || null,
      }
    })
    
    return {
      ok: true,
      migrations,
      message: `Found ${migrations.length} migration(s)`,
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
      error: "Unknown error listing migrations",
    }
  }
}

