import { createGetHandler, createPostHandler } from "@/src/shared/http/route"
import { requireUser } from "@/src/shared/auth/guards"
import { createProjectSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"

export const GET = createGetHandler(async ({ request, requestId }) => {
  try {
    const userId = await requireUser(request)
    
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      // TODO: Add pagination
      take: 100, // Temporary limit
    })
    
    return projects
  } catch (error) {
    console.error(`[${requestId}] Error in GET /api/projects:`, error)
    throw error
  }
})

export const POST = createPostHandler(
  createProjectSchema,
  async ({ request, body }) => {
    const userId = await requireUser(request)

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        userId,
      },
    })

    return project
  }
)

