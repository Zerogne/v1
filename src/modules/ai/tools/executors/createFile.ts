import { prisma } from "@/lib/prisma"
import { createFileSchema } from "../schemas"
import { ToolResult } from "../../providers/types"

export async function createFile(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = createFileSchema.parse(args)
    const { path, content, language } = validated

    // Check if file already exists
    const existing = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    })

    if (existing && !existing.isDeleted) {
      return {
        ok: false,
        error: `File already exists: ${path}`,
      }
    }

    // Create or restore file
    await prisma.projectFile.upsert({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      update: {
        content,
        language: language || null,
        isDeleted: false,
      },
      create: {
        projectId,
        path,
        content,
        language: language || null,
        isDeleted: false,
      },
    })

    return {
      ok: true,
      path,
      message: `Created file: ${path}`,
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
      error: "Unknown error creating file",
    }
  }
}

