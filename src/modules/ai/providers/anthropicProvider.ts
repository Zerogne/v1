import Anthropic from "@anthropic-ai/sdk"
import { executeTool } from "../tools"
import { AiRunResult, AppliedTool } from "./types"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

const MAX_TOOL_ITERS = parseInt(process.env.AI_MAX_TOOL_ITERS || "5", 10)
const DISABLE_PARALLEL_TOOLS = process.env.AI_DISABLE_PARALLEL_TOOLS !== "false"
const AI_CACHE = process.env.AI_CACHE === "true"

// Claude Sonnet 4.5 token limits:
// - Context window: 200,000 tokens (input + output combined)
// - Max output tokens (max_tokens): 8,192 tokens
// - We use 4,096 as default to leave room for input context
// - When enforceToolUse is true, we use 1024 to allow tool calls (tool calls need more tokens)
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || "4096", 10)
const ENFORCE_TOOL_USE_MAX_TOKENS = 1024 // Increased from 256 to allow proper tool call generation

interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: "object"
    properties: Record<string, any>
    required: string[]
  }
}

const TOOLS: ToolDefinition[] = [
  {
    name: "create_file",
    description: "Create a new file in the project. Use this when the user asks you to create something new (e.g., 'create a survey site', 'make a button', 'add a new page'). This is the primary tool for implementing new features.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project-relative path (e.g., 'app/page.tsx', 'app/survey/page.tsx')",
        },
        content: {
          type: "string",
          description: "Complete file content including all necessary code",
        },
        language: {
          type: "string",
          description: "Language/extension (optional, e.g., 'typescript', 'tsx')",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "update_file",
    description: "Update an existing file with new content",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project-relative path",
        },
        content: {
          type: "string",
          description: "New file content",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "apply_patch",
    description: "Apply a unified diff patch to a file (preferred for small edits)",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project-relative path",
        },
        patch: {
          type: "string",
          description: "Unified diff patch",
        },
      },
      required: ["path", "patch"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file (soft delete)",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project-relative path",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "rename_file",
    description: "Rename a file",
    input_schema: {
      type: "object",
      properties: {
        oldPath: {
          type: "string",
          description: "Current path",
        },
        newPath: {
          type: "string",
          description: "New path",
        },
      },
      required: ["oldPath", "newPath"],
    },
  },
  {
    name: "supabase_require_connection",
    description: "Check if Supabase is connected for this project. Call this FIRST before any database operations. Returns error if not connected.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_create_migration",
    description: "Create a SQL migration file in supabase/migrations/ and automatically execute it on Supabase. Use this when the user requests database schema changes (tables, indexes, RLS policies). The migration will be automatically executed.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short descriptive title for the migration (e.g., 'create_feedback_table')",
        },
        sql: {
          type: "string",
          description: "Complete SQL migration code",
        },
        notes: {
          type: "string",
          description: "Optional notes about the migration",
        },
      },
      required: ["title", "sql"],
    },
  },
  {
    name: "supabase_list_migrations",
    description: "List all migrations for this project with their status (draft/applied)",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_is_migration_applied",
    description: "Check if a specific migration has been applied by the user",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Migration file path (e.g., 'supabase/migrations/20251220_001_create_feedback.sql')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "supabase_execute_migration",
    description: "Execute a SQL migration on Supabase database. This automatically runs the SQL and marks it as applied.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Migration file path to execute",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "supabase_execute_pending_migrations",
    description: "Automatically execute ALL pending migrations for this project. Use this when you see pending migrations that need to be executed. This will run all migrations that haven't been applied yet in the correct order.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
]

export async function runAnthropicWithTools(
  projectId: string,
  systemPrompt: string,
  userMessage: string,
  options?: {
    enforceToolUse?: boolean
    images?: string[] // Base64 image data URLs
    previousMessages?: Array<{ role: "user" | "assistant" | "system"; content: string; images?: string[] }>
    onRetry?: () => void
  }
): Promise<AiRunResult> {
  const startTime = Date.now()
  const model = "claude-sonnet-4-5"
  
  // Build messages array with chat history
  const messages: Anthropic.MessageParam[] = []
  
  // Add previous messages (excluding the current one which will be added next)
  if (options?.previousMessages && options.previousMessages.length > 0) {
    // Convert previous messages to Anthropic format
    for (const msg of options.previousMessages) {
      // Skip system messages in history (they're in system prompt)
      if (msg.role === "system") continue
      
      // Build content array for messages with images
      const content: Array<{ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }> = []
      
      // Add images if present
      if (msg.images && msg.images.length > 0) {
        for (const imageDataUrl of msg.images) {
          // Extract base64 data and media type from data URL
          const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            const [, mediaType, base64Data] = match
            // Validate and normalize media type
            const validMediaType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
              ? (mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
              : "image/png" // Default fallback
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: validMediaType,
                data: base64Data,
              },
            })
          }
        }
      }
      
      // Add text content
      if (msg.content) {
        content.push({ type: "text", text: msg.content })
      }
      
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: content.length > 0 ? content : msg.content,
      })
    }
  }
  
  // Build current user message with images
  const currentContent: Array<{ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }> = []
  
  // Add images if present
  if (options?.images && options.images.length > 0) {
    for (const imageDataUrl of options.images) {
      // Extract base64 data and media type from data URL
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const [, mediaType, base64Data] = match
        // Validate and normalize media type
        const validMediaType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
          ? (mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
          : "image/png" // Default fallback
        currentContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: validMediaType,
            data: base64Data,
          },
        })
      }
    }
  }
  
  // Add text content
  if (userMessage) {
    currentContent.push({ type: "text", text: userMessage })
  }
  
  // Add current user message
  messages.push({
    role: "user",
    content: currentContent.length > 0 ? currentContent : userMessage,
  })

  const appliedTools: AppliedTool[] = []
  let assistantText = ""
  let iterations = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let stopReason: string | undefined
  const contentBlockTypes: string[] = []

  while (iterations < MAX_TOOL_ITERS) {
    // Build system message with prompt caching if enabled
    // Cache only the stable system prompt parts (rules, stack, tooling)
    const stableSystemParts = systemPrompt.split("\n\nCONTEXT FILES")[0] // Everything before context files
    const dynamicSystemParts = systemPrompt.includes("\n\nCONTEXT FILES")
      ? systemPrompt.split("\n\nCONTEXT FILES")[1]
      : ""

    const systemContent = AI_CACHE
      ? [
          {
            type: "text" as const,
            text: stableSystemParts,
            cache_control: { type: "ephemeral" as const },
          },
          ...(dynamicSystemParts
            ? [
                {
                  type: "text" as const,
                  text: "\n\nCONTEXT FILES" + dynamicSystemParts,
                },
              ]
            : []),
        ]
      : systemPrompt

    let response
    try {
      // When enforceToolUse is true, use lower max_tokens to prevent wasting tokens on text-only responses
      // If tools are needed, we want the AI to use them quickly, not generate long explanations
      const maxTokens = options?.enforceToolUse 
        ? ENFORCE_TOOL_USE_MAX_TOKENS
        : DEFAULT_MAX_TOKENS
      
      // Ensure max_tokens doesn't exceed model limit (8,192 for Claude Sonnet 4.5)
      const finalMaxTokens = Math.min(maxTokens, 8192)
      
      response = await anthropic.messages.create({
        model,
        max_tokens: finalMaxTokens,
        system: systemContent,
        messages,
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        })),
        tool_choice: options?.enforceToolUse ? { type: "any" } : { type: "auto" },
      })
    } catch (error: any) {
      // Extract error message from Anthropic API error
      let errorMessage = "Anthropic API error"
      if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }
      throw new Error(`Anthropic API: ${errorMessage}`)
    }

    // Capture usage metrics
    if (response.usage) {
      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens
      // Note: cache tokens might not be available in all SDK versions
      if ("cache_creation_input_tokens" in response.usage) {
        cacheWriteTokens += (response.usage as any).cache_creation_input_tokens || 0
      }
      if ("cache_read_input_tokens" in response.usage) {
        cacheReadTokens += (response.usage as any).cache_read_input_tokens || 0
      }
    }

    stopReason = response.stop_reason || undefined

    // Accumulate text blocks
    const textBlocks: string[] = []
    const toolUseBlocks: Array<{
      id: string
      name: string
      input: Record<string, any>
    }> = []

    for (const block of response.content) {
      contentBlockTypes.push(block.type)
      if (block.type === "text") {
        textBlocks.push(block.text)
      } else if (block.type === "tool_use") {
        toolUseBlocks.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, any>,
        })
      }
    }

    assistantText += textBlocks.join("\n")

    // Tool-use enforcement: if edits expected but no tools on first iteration
    if (iterations === 0 && options?.enforceToolUse && toolUseBlocks.length === 0) {
      console.log("[Anthropic] No tools used on first iteration, enforcing retry...")
      if (options.onRetry) {
        options.onRetry()
      }
      
      // Retry with nudge - use required tool_choice to force tool use
      const retryResponse = await anthropic.messages.create({
        model,
        max_tokens: ENFORCE_TOOL_USE_MAX_TOKENS, // Keep low to prevent token waste
        system: systemContent,
        messages: [
          ...messages,
          {
            role: "assistant",
            content: response.content,
          },
          {
            role: "user",
            content: "You must use tools to apply changes. Output tool calls only.",
          },
        ],
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        })),
        tool_choice: { type: "any" }, // Force tool use on retry
      })

      // Update metrics
      if (retryResponse.usage) {
        totalInputTokens += retryResponse.usage.input_tokens
        totalOutputTokens += retryResponse.usage.output_tokens
      }

      // Check if retry produced tools
      const retryToolUseBlocks: Array<{
        id: string
        name: string
        input: Record<string, any>
      }> = []

      for (const block of retryResponse.content) {
        if (block.type === "tool_use") {
          retryToolUseBlocks.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, any>,
          })
        }
      }

      if (retryToolUseBlocks.length === 0) {
        // Still no tools, return error
        const durationMs = Date.now() - startTime
        // If no tools and no text, show error message
        const errorText = assistantText.trim() || (appliedTools.length === 0 ? "No response generated" : "")
        return {
          assistantText: errorText,
          appliedTools,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cacheReadTokens: cacheReadTokens > 0 ? cacheReadTokens : undefined,
          cacheWriteTokens: cacheWriteTokens > 0 ? cacheWriteTokens : undefined,
          toolIterations: iterations,
          toolCallsCount: appliedTools.length,
          durationMs,
          stopReason,
          contentBlockTypes,
        }
      }

      // Use retry response
      response = retryResponse
      stopReason = response.stop_reason || undefined

      // Re-process retry response
      toolUseBlocks.length = 0
      for (const block of response.content) {
        if (block.type === "tool_use") {
          toolUseBlocks.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, any>,
          })
        }
      }
    }

    // If no tool use, we're done
    if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
      break
    }

    // Execute tools and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const toolStartTime = Date.now()
      const result = await executeTool(projectId, toolUse.name, toolUse.input)
      const toolDurationMs = Date.now() - toolStartTime

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      })

      appliedTools.push({
        toolName: toolUse.name,
        args: toolUse.input,
        result,
        durationMs: toolDurationMs,
      })

      // Log tool execution
      console.log(
        `[Anthropic] Tool: ${toolUse.name}, Result: ${result.ok ? "✓" : "✗"}, Duration: ${toolDurationMs}ms`
      )
    }

    // Add assistant message with tool use
    messages.push({
      role: "assistant",
      content: response.content,
    })

    // Add tool results as user message (must immediately follow tool_use)
    messages.push({
      role: "user",
      content: toolResults,
    })

    iterations++
  }

  const durationMs = Date.now() - startTime

  // Log run stats
  console.log(`[Anthropic] Run complete:`)
  console.log(`  Stop reason: ${stopReason}`)
  console.log(`  Content blocks: ${contentBlockTypes.join(", ")}`)
  console.log(`  Tools executed: ${appliedTools.map((t) => t.toolName).join(", ")}`)
  console.log(`  Tool results: ${appliedTools.map((t) => (t.result.ok ? "✓" : "✗")).join(", ")}`)
  console.log(`  Duration: ${durationMs}ms`)
  console.log(`  Input tokens: ${totalInputTokens}, Output tokens: ${totalOutputTokens}`)
  if (cacheReadTokens > 0 || cacheWriteTokens > 0) {
    console.log(`  Cache read: ${cacheReadTokens}, Cache write: ${cacheWriteTokens}`)
  }

  // If tools were used, empty text is acceptable (AI might only use tools without text)
  // Only show "No response generated" if no tools AND no text
  const finalAssistantText = assistantText.trim() || 
    (appliedTools.length === 0 ? "No response generated" : "")

  return {
    assistantText: finalAssistantText,
    appliedTools,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheReadTokens: cacheReadTokens > 0 ? cacheReadTokens : undefined,
    cacheWriteTokens: cacheWriteTokens > 0 ? cacheWriteTokens : undefined,
    toolIterations: iterations,
    toolCallsCount: appliedTools.length,
    durationMs,
    stopReason,
    contentBlockTypes,
  }
}
