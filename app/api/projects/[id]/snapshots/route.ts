import { createGetHandler, createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { createSnapshotSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"

export const GET = createGetHandler(async ({ request, params }) => {
  const { id: projectId } = await params
  await requireProjectOwner(request, projectId)

  const snapshots = await prisma.snapshot.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    // TODO: Add pagination
    take: 100, // Temporary limit
  })

  return snapshots
})

export const POST = createPostHandler(
  createSnapshotSchema,
  async ({ request, body, params }) => {
    const { id: projectId } = await params
    await requireProjectOwner(request, projectId)

    // Get all current non-deleted files
    const files = await prisma.projectFile.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
    })

    // Create snapshot with all files in a transaction
    const snapshot = await prisma.$transaction(async (tx) => {
      const snapshot = await tx.snapshot.create({
        data: {
          projectId,
          label: body.label,
        },
      })

      // Create snapshot files in batch
      if (files.length > 0) {
        await tx.snapshotFile.createMany({
          data: files.map((file) => ({
            snapshotId: snapshot.id,
            path: file.path,
            content: file.content,
            language: file.language,
          })),
        })
      }

      // Return snapshot with files
      return tx.snapshot.findUnique({
        where: { id: snapshot.id },
        include: {
          snapshotFiles: true,
        },
      })
    })

    if (!snapshot) {
      throw new Error("Failed to create snapshot")
    }

    return snapshot
  }
)
