export interface ToolResult {
  ok: boolean
  path?: string
  message?: string
  error?: string
}

export interface AppliedTool {
  toolName: string
  args: Record<string, any>
  result: ToolResult
  durationMs?: number
}

export interface AiRunResult {
  assistantText: string
  appliedTools: AppliedTool[]
  rawResponse?: any
  // Metrics
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  toolIterations: number
  toolCallsCount: number
  durationMs: number
  stopReason?: string
  contentBlockTypes?: string[]
}

