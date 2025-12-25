import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { getUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectivePlanForUser, getPlanLimits } from "@/lib/entitlements"
import { ensureMonthlyGrant, getBalance, canAfford, charge } from "@/lib/credits"
import {
  calculateVendorCost,
  calculateCreditsCharged,
  estimateCreditsCharged,
  getModelForTask,
} from "@/lib/pricing"
import { runAnthropicWithTools } from "@/src/modules/ai/providers/anthropicProvider"
import { buildProjectContext } from "@/src/modules/ai/context/buildProjectContext"
import { getSystemPrompt } from "@/src/modules/ai/prompts/system"
import { Errors } from "@/src/shared/lib/errors"
import { nanoid } from "nanoid"

const requestSchema = z.object({
  taskType: z
    .enum(["CODE_EDIT", "UX_REVIEW", "SUMMARIZE", "FILE_SELECT", "MULTI_FILE_CHANGE", "BACKEND_SCHEMA"])
    .default("CODE_EDIT"),
  projectId: z.string().optional(),
  chatSessionId: z.string().optional(),
  baseSnapshotId: z.string().optional(),
  message: z.string().min(1),
  selectedFilePath: z.string().optional(),
  context: z
    .object({
      selectedFile: z.string().optional(),
      essentialFiles: z.array(z.string()).optional(),
      fileList: z.array(z.object({ path: z.string(), size: z.number().optional() })).optional(),
    })
    .optional(),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body }) => {
    const userId = await getUserId(request)

    // 1. Resolve entitlements
    const effectivePlan = await getEffectivePlanForUser(userId)
    const planLimits = getPlanLimits(effectivePlan.tier)

    // 2. Ensure monthly grant exists
    await ensureMonthlyGrant(effectivePlan.ownerType, effectivePlan.ownerId, effectivePlan.tier)

    // 3. Check balance
    const balance = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)
    if (balance <= 0) {
      throw Errors.paymentRequired(
        effectivePlan.tier === "FREE"
          ? "Out of credits. Upgrade to Pro for more credits."
          : "Out of credits. Top-up coming soon."
      )
    }

    // 4. Model routing (FREE tier hard-locked to Haiku)
    const model = getModelForTask(body.taskType, effectivePlan.tier)

    // 5. Build context (with plan limits)
    let context
    let systemPrompt
    const projectId = body.projectId

    if (!projectId) {
      throw Errors.badRequest("projectId is required")
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    })

    if (!project) {
      throw Errors.notFound("Project not found or access denied")
    }

    // Build context with file limits
    const baseSnapshotId = body.baseSnapshotId
    if (!baseSnapshotId) {
      throw Errors.badRequest("baseSnapshotId is required")
    }

    const selectedFilePath = body.selectedFilePath || body.context?.selectedFile

    context = await buildProjectContext({
      projectId,
      baseSnapshotId,
      selectedFilePath,
    })

      // Apply plan limits to context (limit essential files)
      if (context.contextFilesCount > planLimits.maxContextFiles) {
        // Trim essential files to fit within limit
        const maxEssentialFiles = Math.max(0, planLimits.maxContextFiles - (context.selectedFile ? 1 : 0))
        context.essentialFiles = context.essentialFiles.slice(0, maxEssentialFiles)
        context.contextFilesCount = (context.selectedFile ? 1 : 0) + context.essentialFiles.length
        // Recalculate contextBytes
        context.contextBytes =
          (context.selectedFile?.content.length || 0) +
          context.essentialFiles.reduce((sum, f) => sum + f.content.length, 0)
      }

    systemPrompt = getSystemPrompt(context)

    // 6. Estimate credits (conservative)
    const estimatedInputTokens = Math.min(
      Math.ceil((systemPrompt.length + body.message.length) / 4),
      planLimits.maxInputTokens
    )
    const estimatedOutputTokens = Math.min(planLimits.maxOutputTokens, 4096)
    const estimatedCredits = estimateCreditsCharged(model, estimatedInputTokens, estimatedOutputTokens)

    // 7. Pre-check balance
    if (!(await canAfford(effectivePlan.ownerType, effectivePlan.ownerId, estimatedCredits))) {
      throw Errors.paymentRequired(
        effectivePlan.tier === "FREE"
          ? "Insufficient credits. Upgrade to Pro for more credits."
          : "Insufficient credits. Top-up coming soon."
      )
    }

    // 8. Call AI provider
    const requestId = nanoid()
    let aiResult
    let actualInputTokens = 0
    let actualOutputTokens = 0

    try {
      if (projectId) {
        // Use existing runAnthropicWithTools for project-based calls
        aiResult = await runAnthropicWithTools(projectId, systemPrompt, body.message, {
          enforceToolUse: body.taskType === "CODE_EDIT" || body.taskType === "MULTI_FILE_CHANGE",
        })
        actualInputTokens = aiResult.inputTokens || estimatedInputTokens
        actualOutputTokens = aiResult.outputTokens || estimatedOutputTokens
      } else {
        // Simple text completion (not implemented yet - would need a simpler provider call)
        throw Errors.badRequest("Project-based AI calls only for now")
      }
    } catch (error) {
      // Don't charge for failed requests
      throw error
    }

    // 9. Calculate actual cost and credits
    const vendorCostUsd = calculateVendorCost(model, actualInputTokens, actualOutputTokens)
    const creditsCharged = calculateCreditsCharged(vendorCostUsd)

    // 10. Final balance check
    const finalBalance = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)
    if (finalBalance < creditsCharged) {
      // This shouldn't happen if estimation was good, but handle it
      throw Errors.paymentRequired("Insufficient credits after request processing")
    }

    // 11. Charge credits
    await charge(effectivePlan.ownerType, effectivePlan.ownerId, creditsCharged, requestId)

    // 12. Record usage event
    await prisma.aiUsageEvent.create({
      data: {
        requestId,
        userId,
        projectId: projectId || null,
        workspaceId: effectivePlan.workspaceId || null,
        modelUsed: model,
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        vendorCostUsd,
        creditsCharged,
      },
    })

    // 13. Get updated balance
    const creditsRemaining = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)

    // 14. Return result
    return {
      ...aiResult,
      creditsRemaining,
      tier: effectivePlan.tier,
      ownerType: effectivePlan.ownerType,
      creditsCharged,
      vendorCostUsd,
    }
  }
)

