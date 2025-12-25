import { prisma } from "@/lib/prisma"
import { renameFileSchema } from "../schemas"
import { ToolResult } from "../../providers/types"

export async function renameFile(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = renameFileSchema.parse(args)
    const { oldPath, newPath } = validated

    if (oldPath === newPath) {
      return {
        ok: false,
        error: "Old and new paths are the same",
      }
    }

    const oldFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: oldPath,
        },
      },
    })

    if (!oldFile || oldFile.isDeleted) {
      return {
        ok: false,
        error: `File not found: ${oldPath}`,
      }
    }

    // Check if new path already exists
    const existing = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: newPath,
        },
      },
    })

    if (existing && !existing.isDeleted) {
      return {
        ok: false,
        error: `File already exists at new path: ${newPath}`,
      }
    }

    // Delete old file and create new one (SQLite doesn't support update on unique constraint)
    await prisma.$transaction([
      prisma.projectFile.update({
        where: {
          projectId_path: {
            projectId,
            path: oldPath,
          },
        },
        data: {
          isDeleted: true,
        },
      }),
      prisma.projectFile.upsert({
        where: {
          projectId_path: {
            projectId,
            path: newPath,
          },
        },
        update: {
          content: oldFile.content,
          language: oldFile.language,
          isDeleted: false,
        },
        create: {
          projectId,
          path: newPath,
          content: oldFile.content,
          language: oldFile.language,
          isDeleted: false,
        },
      }),
    ])

    return {
      ok: true,
      path: newPath,
      message: `Renamed file from ${oldPath} to ${newPath}`,
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
      error: "Unknown error renaming file",
    }
  }
}

