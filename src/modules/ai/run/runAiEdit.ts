import { prisma } from "@/lib/prisma"
import { buildProjectContext } from "../context/buildProjectContext"
import { getSystemPrompt } from "../prompts/system"
import { runAnthropicWithTools } from "../providers/anthropicProvider"

interface RunAiEditOptions {
  userId: string
  projectId: string
  chatSessionId: string
  baseSnapshotId: string
  message: string
  images?: string[] // Base64 image data URLs
  selectedFilePath?: string
}

interface RunAiEditResult {
  newSnapshotId: string
  assistantText: string
  appliedTools: Array<{
    toolName: string
    args: Record<string, any>
    result: { ok: boolean; path?: string; message?: string; error?: string }
  }>
  error?: string
}

// Detect if user request implies edits
function requiresEdits(message: string, selectedFilePath?: string): boolean {
  if (selectedFilePath) return true
  
  const editPattern = /(create|add|edit|update|change|refactor|fix|implement|build|make)/i
  return editPattern.test(message)
}

export async function runAiEdit({
  userId,
  projectId,
  chatSessionId,
  baseSnapshotId,
  message,
  images,
  selectedFilePath,
}: RunAiEditOptions): Promise<RunAiEditResult> {
  const runStartTime = Date.now()
  
  // 1. AuthZ: confirm user owns project & chat
  const [project, chat] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    }),
    prisma.chatSession.findUnique({
      where: { id: chatSessionId },
      select: { userId: true, projectId: true },
    }),
  ])

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or access denied")
  }

  if (!chat || chat.userId !== userId || chat.projectId !== projectId) {
    throw new Error("Chat session not found or access denied")
  }

  // 2. Load previous chat history for context (limit to last 10 messages to prevent token overflow)
  const previousMessages = await prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: "desc" },
    take: 10, // Limit to last 10 messages
    select: {
      role: true,
      content: true,
    },
  })
  
  // Reverse to get chronological order
  previousMessages.reverse()

  // 3. Save USER message first
  await prisma.chatMessage.create({
    data: {
      chatSessionId,
      role: "user",
      content: message,
    },
  })

  // 4. Build context (with metrics)
  const context = await buildProjectContext({
    projectId,
    baseSnapshotId,
    selectedFilePath,
  })

  // 5. Build system prompt
  const systemPrompt = getSystemPrompt(context)

  // 6. Create AiRun status="running"
  const systemPromptPreview = "Building context..."
  const promptPreview = `${systemPromptPreview}\n\nUser: ${message}`

  let retries = 0
  const enforceToolUse = requiresEdits(message, selectedFilePath)

  const aiRun = await prisma.aiRun.create({
    data: {
      userId,
      projectId,
      chatSessionId,
      baseSnapshotId,
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      status: "running",
      prompt: promptPreview,
      contextBytes: context.contextBytes,
      contextFilesCount: context.contextFilesCount,
      selectedFilePath: selectedFilePath || null,
      retries: 0,
    },
  })

  try {
    // 7. Call Anthropic provider with tools and chat history
    let result = await runAnthropicWithTools(
      projectId,
      systemPrompt,
      message,
      {
        enforceToolUse,
        images,
        previousMessages: previousMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
          images: (msg as any).images, // Preserve images from previous messages
        })),
        onRetry: () => {
          retries++
        },
      }
    )

    // If tool-use was enforced but still no tools, return error
    if (enforceToolUse && result.toolCallsCount === 0) {
      const errorMsg = "AI did not return tool actions. Try selecting a file or being more specific."
      await prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "failed",
          error: errorMsg,
          retries,
          durationMs: Date.now() - runStartTime,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cacheReadTokens: result.cacheReadTokens,
          cacheWriteTokens: result.cacheWriteTokens,
          toolIterations: result.toolIterations,
          toolCallsCount: result.toolCallsCount,
        },
      })
      return {
        newSnapshotId: "",
        assistantText: result.assistantText,
        appliedTools: [],
        error: errorMsg,
      }
    }

    // Count patch failures
    let patchFailures = 0
    const patchFailuresByFile = new Map<string, number>()

    // 7. Store tool invocations with metrics
    for (const tool of result.appliedTools) {
      // Track patch failures
      if (tool.toolName === "apply_patch" && !tool.result.ok) {
        patchFailures++
        const path = tool.args.path as string
        const currentFailures = patchFailuresByFile.get(path) || 0
        patchFailuresByFile.set(path, currentFailures + 1)
      }

      await prisma.aiToolInvocation.create({
        data: {
          aiRunId: aiRun.id,
          toolName: tool.toolName,
          args: tool.args as any,
          result: tool.result as any,
          success: tool.result.ok,
          durationMs: tool.durationMs,
        },
      })
    }

    // 8. Create new Snapshot and persist ASSISTANT message in transaction
    const currentFiles = await prisma.projectFile.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
    })

    const newSnapshot = await prisma.$transaction(async (tx) => {
      // Create snapshot
      const snapshot = await tx.snapshot.create({
        data: {
          projectId,
          label: `AI edit: ${new Date().toISOString()}`,
        },
      })

      // Create snapshot files in batch
      if (currentFiles.length > 0) {
        await tx.snapshotFile.createMany({
          data: currentFiles.map((file) => ({
            snapshotId: snapshot.id,
            path: file.path,
            content: file.content,
            language: file.language,
          })),
        })
      }

      // Persist ASSISTANT message (user message already saved)
      await tx.chatMessage.create({
        data: {
          chatSessionId,
          role: "assistant",
          content: result.assistantText,
        },
      })

      return snapshot
    })

    // 10. Update AiRun with all metrics
    const durationMs = Date.now() - runStartTime
    await prisma.aiRun.update({
      where: { id: aiRun.id },
      data: {
        status: "applied",
        responseText: result.assistantText,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
        toolIterations: result.toolIterations,
        toolCallsCount: result.toolCallsCount,
        patchFailures,
        durationMs,
        retries,
      },
    })

    return {
      newSnapshotId: newSnapshot.id,
      assistantText: result.assistantText,
      appliedTools: result.appliedTools.map((tool) => ({
        toolName: tool.toolName,
        args: tool.args,
        result: tool.result,
      })),
    }
  } catch (error) {
    // On error: AiRun status="failed"
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const durationMs = Date.now() - runStartTime
    
    await prisma.aiRun.update({
      where: { id: aiRun.id },
      data: {
        status: "failed",
        error: errorMessage,
        durationMs,
        retries,
      },
    })

    throw error
  }
}
