import { prisma } from "./prisma"
import { LedgerOwnerType, LedgerEntryType, PlanTier } from "./generated/prisma/enums"
import { getEffectivePlanForUser, getPlanLimits } from "./entitlements"

/**
 * Get current credit balance for an owner
 * Computes: sum of all grants/topups (positive) minus all spend (negative)
 * Monthly grants only count for current period
 */
export async function getBalance(
  ownerType: LedgerOwnerType,
  ownerId: string
): Promise<number> {
  const now = new Date()
  const currentPeriodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`

  // Get all entries
  const entries = await prisma.creditLedgerEntry.findMany({
    where: {
      ownerType,
      ownerId,
    },
  })

  let balance = 0

  for (const entry of entries) {
    if (entry.type === "MONTHLY_GRANT") {
      // Only count monthly grants for current period
      if (entry.periodKey === currentPeriodKey) {
        balance += entry.amountCredits
      }
      // Previous period grants are effectively expired (not counted)
    } else {
      // TOPUP, SPEND, ADJUSTMENT all count
      balance += entry.amountCredits
    }
  }

  return balance
}

/**
 * Ensure monthly grant exists for current period
 * Grants:
 * - FREE: 1.0 credits
 * - PRO: 10.0 credits
 * - TEAM: 15.0 * seatCount credits (pooled to workspace)
 */
export async function ensureMonthlyGrant(
  ownerType: LedgerOwnerType,
  ownerId: string,
  tier: PlanTier
): Promise<void> {
  const now = new Date()
  const currentPeriodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`

  // Check if grant already exists for this period
  const existingGrant = await prisma.creditLedgerEntry.findFirst({
    where: {
      ownerType,
      ownerId,
      type: "MONTHLY_GRANT",
      periodKey: currentPeriodKey,
    },
  })

  if (existingGrant) {
    return // Grant already exists
  }

  // Calculate grant amount
  let grantAmount = 0
  if (tier === "FREE") {
    grantAmount = parseFloat(process.env.FREE_MONTHLY_CREDITS || "1.0")
  } else if (tier === "PRO") {
    grantAmount = 10.0
  } else if (tier === "TEAM") {
    // Get workspace seat count
    if (ownerType === "WORKSPACE") {
      const workspace = await prisma.workspace.findUnique({
        where: { id: ownerId },
        select: { seatCount: true },
      })
      const seatCount = workspace?.seatCount || 1
      grantAmount = 15.0 * seatCount
    } else {
      grantAmount = 15.0 // Fallback if called for user instead of workspace
    }
  }

  if (grantAmount > 0) {
    await prisma.creditLedgerEntry.create({
      data: {
        ownerType,
        ownerId,
        type: "MONTHLY_GRANT",
        amountCredits: grantAmount,
        periodKey: currentPeriodKey,
      },
    })
  }
}

/**
 * Check if owner can afford estimated charge
 */
export async function canAfford(
  ownerType: LedgerOwnerType,
  ownerId: string,
  estimatedChargeCredits: number
): Promise<boolean> {
  const balance = await getBalance(ownerType, ownerId)
  return balance >= estimatedChargeCredits
}

/**
 * Charge credits for an AI request
 * Creates a SPEND entry (negative amount)
 */
export async function charge(
  ownerType: LedgerOwnerType,
  ownerId: string,
  credits: number,
  requestId: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (credits <= 0) {
    throw new Error("Charge amount must be positive")
  }

  const balance = await getBalance(ownerType, ownerId)
  if (balance < credits) {
    throw new Error(`Insufficient credits. Balance: ${balance}, Required: ${credits}`)
  }

  await prisma.creditLedgerEntry.create({
    data: {
      ownerType,
      ownerId,
      type: "SPEND",
      amountCredits: -credits, // Negative for spend
      ref: requestId,
    },
  })
}

/**
 * Add topup credits (for admin/testing)
 */
export async function addTopup(
  ownerType: LedgerOwnerType,
  ownerId: string,
  amountCredits: number,
  ref?: string
): Promise<void> {
  if (amountCredits <= 0) {
    throw new Error("Topup amount must be positive")
  }

  await prisma.creditLedgerEntry.create({
    data: {
      ownerType,
      ownerId,
      type: "TOPUP",
      amountCredits,
      ref: ref || `topup-${Date.now()}`,
    },
  })
}

