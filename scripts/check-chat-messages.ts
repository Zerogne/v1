// Load environment variables FIRST before importing prisma
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

// Set DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db"
}

import { prisma } from "../lib/prisma"

async function checkChatMessages() {
  try {
    // Get the most recent AI run
    const latestRun = await prisma.aiRun.findFirst({
      orderBy: { createdAt: "desc" },
      where: { status: "applied" },
      include: {
        chatSession: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        toolInvocations: true,
      },
    })

    if (!latestRun) {
      console.log("No successful AI runs found")
      return
    }

    console.log("\n=== LATEST SUCCESSFUL AI RUN ===")
    console.log(`Run ID: ${latestRun.id}`)
    console.log(`Status: ${latestRun.status}`)
    console.log(`Response Text Length: ${latestRun.responseText?.length || 0} chars`)
    console.log(`Tool Invocations: ${latestRun.toolInvocations.length}`)
    
    if (latestRun.responseText) {
      console.log(`\n=== AI RESPONSE ===`)
      console.log(latestRun.responseText.substring(0, 500))
      if (latestRun.responseText.length > 500) {
        console.log("...")
      }
    }

    console.log(`\n=== CHAT MESSAGES ===`)
    for (const msg of latestRun.chatSession.messages) {
      console.log(`\n[${msg.role.toUpperCase()}]`)
      console.log(msg.content.substring(0, 300))
      if (msg.content.length > 300) {
        console.log("...")
      }
    }

    console.log(`\n=== TOOL INVOCATIONS ===`)
    if (latestRun.toolInvocations.length === 0) {
      console.log("No tools were executed")
    } else {
      for (const tool of latestRun.toolInvocations) {
        console.log(`\nTool: ${tool.toolName}`)
        console.log(`Args:`, JSON.stringify(tool.args, null, 2))
        if (tool.result) {
          console.log(`Result:`, JSON.stringify(tool.result, null, 2))
        }
      }
    }

    // Check project files
    const projectFiles = await prisma.projectFile.findMany({
      where: {
        projectId: latestRun.projectId,
        isDeleted: false,
      },
      orderBy: { path: "asc" },
    })

    console.log(`\n=== PROJECT FILES ===`)
    console.log(`Total files: ${projectFiles.length}`)
    for (const file of projectFiles) {
      console.log(`  ${file.path} (${file.language || "unknown"}) - ${file.content.length} chars`)
      if (file.content.length > 0) {
        console.log(`    Preview: ${file.content.substring(0, 100).replace(/\n/g, " ")}...`)
      }
    }

  } catch (error) {
    console.error("Error checking chat messages:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkChatMessages()

