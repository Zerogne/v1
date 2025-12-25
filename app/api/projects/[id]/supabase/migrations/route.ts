import { createGetHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { prisma } from "@/lib/prisma"

export const GET = createGetHandler(async ({ request, params }) => {
  const { id: projectId } = await params
  await requireProjectOwner(request, projectId)
  
  // Get managed Supabase project
  const managedProject = await prisma.managedSupabaseProject.findUnique({
    where: { projectId },
  })

  if (!managedProject) {
    return []
  }
  
  // Get migration files from project
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
  })
  
  // Get applied migrations from ManagedSupabaseMigration
  const appliedMigrations = await prisma.managedSupabaseMigration.findMany({
    where: {
      managedSupabaseProjectId: managedProject.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  
  // Create a map of applied migrations by name (path)
  const appliedMap = new Map(
    appliedMigrations.map((m) => [m.name, m])
  )
  
  // Combine file info with applied status
  const migrations = await Promise.all(
    migrationFiles.map(async (file) => {
      // Try to find matching applied migration by name
      const applied = Array.from(appliedMap.values()).find((m) => 
        m.name === file.path || m.name.includes(file.path.split("/").pop() || "")
      )
      
      return {
        path: file.path,
        status: applied?.status || "pending",
        createdAt: file.createdAt,
        appliedAt: applied?.appliedAt || null,
        sqlPreview: file.content?.substring(0, 200) || "",
      }
    })
  )
  
  return migrations
})

