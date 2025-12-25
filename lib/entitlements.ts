import { prisma } from "./prisma"
import type { PlanTier, LedgerOwnerType } from "./generated/prisma/client"

export interface PlanLimits {
  maxInputTokens: number
  maxOutputTokens: number
  maxContextFiles: number
  maxAiRunsPerDay?: number
  backendAllowed: boolean
  backendQuota: number
}

export interface EffectivePlan {
  tier: PlanTier
  ownerType: LedgerOwnerType
  ownerId: string
  workspaceId?: string
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxInputTokens: 50000,
    maxOutputTokens: 4096,
    maxContextFiles: 10,
    maxAiRunsPerDay: 20,
    backendAllowed: true,
    backendQuota: 1,
  },
  PRO: {
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    maxContextFiles: 50,
    backendAllowed: true,
    backendQuota: 1,
  },
  TEAM: {
    maxInputTokens: 500000,
    maxOutputTokens: 16384,
    maxContextFiles: 100,
    backendAllowed: true,
    backendQuota: 3,
  },
}

/**
 * Get effective plan for a user
 * Rules:
 * - If user is in a TEAM workspace (primary = first workspace), tier=TEAM and owner=WORKSPACE
 * - Else if user has PRO subscription active, tier=PRO and owner=USER
 * - Else tier=FREE and owner=USER
 */
export async function getEffectivePlanForUser(
  userId: string
): Promise<EffectivePlan> {
  // Check if user is in a TEAM workspace
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: {
      workspace: {
        include: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: "asc" }, // Primary workspace = first one
  })

  if (workspaceMember) {
    const workspace = workspaceMember.workspace
    // Check if workspace has TEAM subscription
    const workspaceSubscription = await prisma.subscriptionState.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: "WORKSPACE",
          ownerId: workspace.id,
        },
      },
    })

    // Only return TEAM if workspace actually has an active TEAM subscription
    if (workspaceSubscription && workspaceSubscription.planTier === "TEAM" && workspaceSubscription.status === "ACTIVE") {
      return {
        tier: "TEAM",
        ownerType: "WORKSPACE",
        ownerId: workspace.id,
        workspaceId: workspace.id,
      }
    }
    // If user is in workspace but workspace doesn't have TEAM subscription,
    // fall through to check user's own subscription
  }

  // Check if user has PRO subscription
  const userSubscription = await prisma.subscriptionState.findUnique({
    where: {
      ownerType_ownerId: {
        ownerType: "USER",
        ownerId: userId,
      },
    },
  })

  if (userSubscription && userSubscription.planTier === "PRO" && userSubscription.status === "ACTIVE") {
    return {
      tier: "PRO",
      ownerType: "USER",
      ownerId: userId,
    }
  }

  // Default to FREE
  return {
    tier: "FREE",
    ownerType: "USER",
    ownerId: userId,
  }
}

/**
 * Get plan limits for a tier
 */
export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier]
}

/**
 * Check if user can create a backend based on plan and quota
 */
export async function canCreateBackend(
  ownerType: LedgerOwnerType,
  ownerId: string
): Promise<{ allowed: boolean; reason?: string; currentCount: number; quota: number }> {
  const limits = await getEffectivePlanForOwner(ownerType, ownerId)
  const planLimits = getPlanLimits(limits.tier)

  if (!planLimits.backendAllowed) {
    return {
      allowed: false,
      reason: "Backend creation not allowed for this plan",
      currentCount: 0,
      quota: 0,
    }
  }

  // Count existing backends for this owner
  const backendCount = await prisma.managedSupabaseProject.count({
    where: {
      ownerType,
      ownerId,
      status: {
        in: ["PROVISIONING", "READY"],
      },
    },
  })

  if (backendCount >= planLimits.backendQuota) {
    return {
      allowed: false,
      reason: `Backend quota exceeded. Limit: ${planLimits.backendQuota}`,
      currentCount: backendCount,
      quota: planLimits.backendQuota,
    }
  }

  return {
    allowed: true,
    currentCount: backendCount,
    quota: planLimits.backendQuota,
  }
}

/**
 * Get effective plan for an owner (user or workspace)
 */
async function getEffectivePlanForOwner(
  ownerType: LedgerOwnerType,
  ownerId: string
): Promise<EffectivePlan> {
  if (ownerType === "WORKSPACE") {
    const subscription = await prisma.subscriptionState.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: "WORKSPACE",
          ownerId,
        },
      },
    })

    if (subscription && subscription.status === "ACTIVE") {
      return {
        tier: subscription.planTier,
        ownerType: "WORKSPACE",
        ownerId,
        workspaceId: ownerId,
      }
    }
  } else {
    const subscription = await prisma.subscriptionState.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: "USER",
          ownerId,
        },
      },
    })

    if (subscription && subscription.status === "ACTIVE") {
      return {
        tier: subscription.planTier,
        ownerType: "USER",
        ownerId,
      }
    }
  }

  // Default to FREE
  return {
    tier: "FREE",
    ownerType,
    ownerId,
  }
}

