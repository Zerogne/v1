import { prisma } from "@/lib/prisma"

interface BuildContextOptions {
  projectId: string
  baseSnapshotId: string
  selectedFilePath?: string
}

export interface ProjectContext {
  project: {
    name: string
  }
  files: Array<{
    path: string
    language?: string | null
  }>
  selectedFile?: {
    path: string
    content: string
    language?: string | null
  }
  essentialFiles: Array<{
    path: string
    content: string
    language?: string | null
  }>
  snapshot: {
    id: string
    createdAt: Date
  }
}

const MAX_CHARS_PER_FILE = 10_000 // Reduced from 20k to prevent token overflow
const MAX_TOTAL_CHARS = 30_000 // Reduced from 60k to prevent token overflow
const MAX_ESSENTIAL_FILES = 2 // Reduced from 3 to save tokens

const ESSENTIAL_FILE_PATTERNS = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "tailwind.config.js",
  "tailwind.config.ts",
]

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content
  }
  return content.substring(0, maxChars) + "\n/* TRUNCATED: file content exceeded limit */"
}

export async function buildProjectContext({
  projectId,
  baseSnapshotId,
  selectedFilePath,
}: BuildContextOptions): Promise<ProjectContext & { contextBytes: number; contextFilesCount: number }> {
  const startTime = Date.now()
  
  // Fetch project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Fetch snapshot
  const snapshot = await prisma.snapshot.findUnique({
    where: { id: baseSnapshotId },
    select: { id: true, createdAt: true },
  })

  if (!snapshot) {
    throw new Error("Snapshot not found")
  }

  // Fetch all non-deleted files (paths only)
  const allFiles = await prisma.projectFile.findMany({
    where: {
      projectId,
      isDeleted: false,
    },
    select: {
      path: true,
      language: true,
    },
    orderBy: {
      path: "asc",
    },
  })

  // Fetch selected file if provided (ALWAYS include, truncate if needed)
  let selectedFile: ProjectContext["selectedFile"] | undefined
  if (selectedFilePath) {
    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: selectedFilePath,
        },
      },
      select: {
        path: true,
        content: true,
        language: true,
      },
    })

    if (file) {
      selectedFile = {
        path: file.path,
        content: truncateContent(file.content, MAX_CHARS_PER_FILE),
        language: file.language,
      }
    }
  }

  // Fetch essential files (max 3, only if present, exclude components/ui unless selected)
  const essentialFiles: ProjectContext["essentialFiles"] = []
  let totalChars = 0
  let essentialFilesCount = 0

  for (const pattern of ESSENTIAL_FILE_PATTERNS) {
    if (essentialFilesCount >= MAX_ESSENTIAL_FILES) break
    
    // Skip if this is the selected file (already included)
    if (selectedFilePath === pattern) continue

    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path: pattern,
        },
      },
      select: {
        path: true,
        content: true,
        language: true,
      },
    })

    if (file) {
      const truncated = truncateContent(file.content, MAX_CHARS_PER_FILE)
      const fileSize = truncated.length
      
      // Check if adding this file would exceed total limit
      const newTotal = totalChars + fileSize + (selectedFile?.content.length || 0)
      if (newTotal > MAX_TOTAL_CHARS) {
        // Truncate this file to fit within limit
        const remaining = MAX_TOTAL_CHARS - totalChars - (selectedFile?.content.length || 0)
        if (remaining > 1000) {
          // Only add if we have meaningful space left
          essentialFiles.push({
            path: file.path,
            content: truncateContent(file.content, remaining),
            language: file.language,
          })
          totalChars += remaining
          essentialFilesCount++
        }
        break
      }

      essentialFiles.push({
        path: file.path,
        content: truncated,
        language: file.language,
      })
      totalChars += fileSize
      essentialFilesCount++
    }
  }

  // Calculate total context bytes
  const contextBytes = 
    (selectedFile?.content.length || 0) +
    essentialFiles.reduce((sum, f) => sum + f.content.length, 0)

  const contextFilesCount = (selectedFile ? 1 : 0) + essentialFiles.length

  return {
    project: {
      name: project.name,
    },
    files: allFiles,
    selectedFile,
    essentialFiles,
    snapshot: {
      id: snapshot.id,
      createdAt: snapshot.createdAt,
    },
    contextBytes,
    contextFilesCount,
  }
}
