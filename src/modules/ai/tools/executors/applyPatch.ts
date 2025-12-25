import { prisma } from "@/lib/prisma"
import { applyPatchSchema } from "../schemas"
import { ToolResult } from "../../providers/types"
import { applyPatch } from "diff"

export async function applyPatchToFile(
  projectId: string,
  args: unknown
): Promise<ToolResult> {
  try {
    const validated = applyPatchSchema.parse(args)
    const { path, patch } = validated

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

    // Apply unified diff patch
    const result = applyPatch(file.content, patch)

    if (result === false || Array.isArray(result) === false) {
      return {
        ok: false,
        error: `Patch failed: Invalid patch format`,
      }
    }

    // result is [string, boolean] or false
    if (Array.isArray(result) && result[0] === false) {
      return {
        ok: false,
        error: `Patch failed: ${result[1]}`,
      }
    }

    const newContent = Array.isArray(result) ? (result[0] as string) : file.content

    await prisma.projectFile.update({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      data: {
        content: newContent,
      },
    })

    return {
      ok: true,
      path,
      message: `Applied patch to: ${path}`,
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
      error: "Unknown error applying patch",
    }
  }
}

