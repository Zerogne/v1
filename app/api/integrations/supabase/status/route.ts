import { createGetHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"

export const GET = createGetHandler(async ({ request }) => {
  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId")
  
  if (!projectId) {
    throw Errors.badRequest("projectId query parameter is required")
  }
  
  await requireProjectOwner(request, projectId)

  const managedProject = await prisma.managedSupabaseProject.findUnique({
    where: { projectId },
    select: {
      id: true,
      supabaseRef: true,
      projectUrl: true,
      publishableKey: true, // Client-safe
      status: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      // NEVER select secretKeyEncrypted or dbPassEncrypted
    },
  })

  if (!managedProject) {
    return {
      status: "NONE",
      projectUrl: null,
      publishableKey: null,
      supabaseRef: null,
      errorMessage: null,
    }
  }

  return {
    status: managedProject.status,
    projectUrl: managedProject.projectUrl,
    publishableKey: managedProject.publishableKey,
    supabaseRef: managedProject.supabaseRef,
    errorMessage: managedProject.errorMessage,
    createdAt: managedProject.createdAt,
    updatedAt: managedProject.updatedAt,
  }
})

