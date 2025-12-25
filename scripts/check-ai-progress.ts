// Load environment variables FIRST before importing prisma
import { config } from "dotenv"
import { resolve } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

// Set DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db"
}

import { prisma } from "../lib/prisma"

async function checkAiProgress() {
  try {
    // Get all AI runs
    const aiRuns = await prisma.aiRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        toolInvocations: {
          orderBy: { createdAt: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log("\n=== AI RUNS ===")
    console.log(`Found ${aiRuns.length} AI runs\n`)

    for (const run of aiRuns) {
      console.log(`Run ID: ${run.id}`)
      console.log(`  Project: ${run.project.name} (${run.projectId})`)
      console.log(`  Status: ${run.status}`)
      console.log(`  Model: ${run.model}`)
      console.log(`  Created: ${run.createdAt}`)
      console.log(`  Prompt preview: ${run.prompt.substring(0, 100)}...`)
      if (run.error) {
        console.log(`  Error: ${run.error}`)
      }
      console.log(`  Tool invocations: ${run.toolInvocations.length}`)
      
      for (const tool of run.toolInvocations) {
        console.log(`    - ${tool.toolName}`)
        console.log(`      Args: ${JSON.stringify(tool.args).substring(0, 80)}...`)
        if (tool.result) {
          const result = tool.result as any
          console.log(`      Result: ${result.ok ? "✓" : "✗"} ${result.message || result.error || "N/A"}`)
        }
      }
      console.log("")
    }

    // Check project files for the most recent project
    if (aiRuns.length > 0) {
      const latestRun = aiRuns[0]
      const projectFiles = await prisma.projectFile.findMany({
        where: {
          projectId: latestRun.projectId,
          isDeleted: false,
        },
        orderBy: { path: "asc" },
      })

      console.log(`\n=== PROJECT FILES (${latestRun.project.name}) ===`)
      console.log(`Found ${projectFiles.length} files\n`)
      for (const file of projectFiles) {
        console.log(`  ${file.path} (${file.language || "unknown"}) - ${file.content.length} chars`)
      }
    }

    // Check snapshots
    if (aiRuns.length > 0) {
      const latestRun = aiRuns[0]
      const snapshots = await prisma.snapshot.findMany({
        where: {
          projectId: latestRun.projectId,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })

      console.log(`\n=== SNAPSHOTS ===`)
      console.log(`Found ${snapshots.length} snapshots\n`)
      for (const snapshot of snapshots) {
        console.log(`  ${snapshot.id} - ${snapshot.label || "No label"} - ${snapshot.createdAt}`)
      }
    }

  } catch (error) {
    console.error("Error checking AI progress:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAiProgress()

