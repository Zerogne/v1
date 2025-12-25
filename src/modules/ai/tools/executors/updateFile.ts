import { prisma } from "@/lib/prisma"
import { updateFileSchema } from "../schemas"
import { ToolResult } from "../../providers/types"

const MAX_FILE_SIZE = 300_000 // 300k chars

export async function updateFile(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = updateFileSchema.parse(args)
    const { path, content } = validated

    // Size guard
    if (content.length > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: `File content exceeds maximum size of ${MAX_FILE_SIZE} characters (got ${content.length}). Please use apply_patch for large files.`,
      }
    }

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

    await prisma.projectFile.update({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      data: {
        content,
      },
    })

    return {
      ok: true,
      path,
      message: `Updated file: ${path}`,
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
      error: "Unknown error updating file",
    }
  }
}

