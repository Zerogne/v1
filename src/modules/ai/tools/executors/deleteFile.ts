import { prisma } from "@/lib/prisma"
import { deleteFileSchema } from "../schemas"
import { ToolResult } from "../../providers/types"

export async function deleteFile(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = deleteFileSchema.parse(args)
    const { path } = validated

    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    })

    if (!file || file.isDeleted) {
      return {
        ok: false,
        error: `File not found: ${path}`,
      }
    }

    // Soft delete
    await prisma.projectFile.update({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      data: {
        isDeleted: true,
      },
    })

    return {
      ok: true,
      path,
      message: `Deleted file: ${path}`,
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
      error: "Unknown error deleting file",
    }
  }
}

