/**
 * Pricing configuration for AI models
 * All prices in USD per 1M tokens
 */

interface ModelPricing {
  inputPricePer1M: number // USD per 1M input tokens
  outputPricePer1M: number // USD per 1M output tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-5": {
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  "claude-3-5-sonnet-20241022": {
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  "claude-3-5-haiku-20241022": {
    inputPricePer1M: 1.0,
    outputPricePer1M: 5.0,
  },
  "claude-3-opus-20240229": {
    inputPricePer1M: 15.0,
    outputPricePer1M: 75.0,
  },
  "gpt-4o": {
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
  },
  "gpt-4o-mini": {
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
  },
}

// Markup percentage (e.g., 1.20 = 20% markup)
const MARKUP_PERCENT = parseFloat(process.env.AI_CREDIT_MARKUP || "1.20")

// 1 credit = $1 USD
const CREDITS_PER_USD = 1.0

/**
 * Calculate vendor cost in USD for token usage
 */
export function calculateVendorCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    // Default pricing if model not found
    console.warn(`Unknown model pricing for ${model}, using default`)
    return (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M

  return inputCost + outputCost
}

/**
 * Calculate credits to charge (with markup)
 */
export function calculateCreditsCharged(vendorCostUsd: number): number {
  const costWithMarkup = vendorCostUsd * MARKUP_PERCENT
  return costWithMarkup * CREDITS_PER_USD
}

/**
 * Estimate credits for a request (before actual usage)
 * Uses conservative estimates
 */
export function estimateCreditsCharged(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  const vendorCost = calculateVendorCost(model, estimatedInputTokens, estimatedOutputTokens)
  return calculateCreditsCharged(vendorCost)
}

/**
 * Get model recommendation based on task type and plan tier
 * - FREE tier: ALWAYS use Haiku (no exceptions)
 * - PRO/TEAM: Route based on task complexity
 *   - Cheaper models for: UX_REVIEW, SUMMARIZE, FILE_SELECT
 *   - Stronger models for: CODE_EDIT, MULTI_FILE_CHANGE, BACKEND_SCHEMA
 */
export function getModelForTask(taskType: string, tier?: "FREE" | "PRO" | "TEAM"): string {
  // CRITICAL: FREE tier is hard-locked to Haiku
  if (tier === "FREE") {
    return process.env.AI_CHEAP_MODEL || "claude-3-5-haiku-20241022"
  }

  // PRO/TEAM: Route based on task type
  const cheapTasks = ["UX_REVIEW", "SUMMARIZE", "FILE_SELECT"]
  const strongTasks = ["CODE_EDIT", "MULTI_FILE_CHANGE", "BACKEND_SCHEMA"]

  if (cheapTasks.includes(taskType)) {
    return process.env.AI_CHEAP_MODEL || "claude-3-5-haiku-20241022"
  } else if (strongTasks.includes(taskType)) {
    return process.env.AI_STRONG_MODEL || "claude-sonnet-4-5"
  }

  // Default for PRO/TEAM
  return process.env.AI_DEFAULT_MODEL || "claude-sonnet-4-5"
}

