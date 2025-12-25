import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireProjectOwner } from "@/src/shared/auth/guards"
import { getRateLimiter } from "@/src/shared/http/rate-limit"
import { config } from "@/src/shared/config/env"
import { Errors } from "@/src/shared/lib/errors"
import { runAiEdit } from "@/src/modules/ai/run/runAiEdit"
import { getEffectivePlanForUser } from "@/lib/entitlements"
import { ensureMonthlyGrant, getBalance, canAfford, charge } from "@/lib/credits"
import { estimateCreditsCharged, calculateVendorCost, calculateCreditsCharged } from "@/lib/pricing"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

const requestSchema = z.object({
  chatSessionId: z.string().min(1),
  baseSnapshotId: z.string().min(1),
  message: z.string().optional(),
  images: z.array(z.string()).optional(), // Base64 image data URLs
  selectedFilePath: z.string().optional(),
  model: z.string().optional(),
}).refine((data) => data.message || (data.images && data.images.length > 0), {
  message: "Either message or images must be provided",
})

// Get rate limiter instance
const rateLimiter = getRateLimiter(config.rateLimit.aiPerMin)

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body, params }) => {
    const { id: projectId } = await params
    const { userId } = await requireProjectOwner(request, projectId)

    // Rate limiting
    const allowed = await rateLimiter.check(userId)
    if (!allowed) {
      throw Errors.rateLimitExceeded()
    }

    // Credit checks
    const effectivePlan = await getEffectivePlanForUser(userId)
    await ensureMonthlyGrant(effectivePlan.ownerType, effectivePlan.ownerId, effectivePlan.tier)
    
    const balance = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)
    if (balance <= 0) {
      throw Errors.paymentRequired(
        effectivePlan.tier === "FREE"
          ? "Out of credits. Upgrade to Pro for more credits."
          : "Out of credits. Top-up coming soon."
      )
    }

    // Estimate credits (conservative)
    const model = body.model || "claude-sonnet-4-5"
    const estimatedInputTokens = 50000 // Conservative estimate
    const estimatedOutputTokens = 4096
    const estimatedCredits = estimateCreditsCharged(model, estimatedInputTokens, estimatedOutputTokens)

    if (!(await canAfford(effectivePlan.ownerType, effectivePlan.ownerId, estimatedCredits))) {
      throw Errors.paymentRequired(
        effectivePlan.tier === "FREE"
          ? "Insufficient credits. Upgrade to Pro for more credits."
          : "Insufficient credits. Top-up coming soon."
      )
    }

    const requestId = nanoid()

    // Run AI edit
    let result
    try {
      result = await runAiEdit({
        userId,
        projectId,
        chatSessionId: body.chatSessionId,
        baseSnapshotId: body.baseSnapshotId,
        message: body.message || "",
        images: body.images,
        selectedFilePath: body.selectedFilePath,
      })

      // If tool-use enforcement failed, return error (don't charge)
      if (result.error) {
        throw Errors.aiNoTools(result.error)
      }

      // Calculate actual cost from AiRun if available
      const aiRun = await prisma.aiRun.findFirst({
        where: {
          userId,
          projectId,
          chatSessionId: body.chatSessionId,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      })

      const inputTokens = aiRun?.inputTokens || estimatedInputTokens
      const outputTokens = aiRun?.outputTokens || estimatedOutputTokens
      const vendorCostUsd = calculateVendorCost(model, inputTokens, outputTokens)
      const creditsCharged = calculateCreditsCharged(vendorCostUsd)

      // Charge credits
      await charge(effectivePlan.ownerType, effectivePlan.ownerId, creditsCharged, requestId)

      // Record usage event
      await prisma.aiUsageEvent.create({
        data: {
          requestId,
          userId,
          projectId,
          workspaceId: effectivePlan.workspaceId || null,
          modelUsed: model,
          inputTokens,
          outputTokens,
          vendorCostUsd,
          creditsCharged,
        },
      })

      // Get updated balance
      const creditsRemaining = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)

      return {
        ...result,
        creditsRemaining,
        creditsCharged,
      }
    } catch (error) {
      // Don't charge for failed requests
      throw error
    }
  }
)

