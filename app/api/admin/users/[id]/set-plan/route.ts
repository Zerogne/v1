import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import type { PlanTier, LedgerOwnerType } from "@/lib/generated/prisma/enums"
import { Errors } from "@/src/shared/lib/errors"
import { ensureMonthlyGrant } from "@/lib/credits"

const requestSchema = z.object({
  planTier: z.enum(["FREE", "PRO", "TEAM"]),
  workspaceId: z.string().optional(),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body, params }) => {
    const { userId: adminUserId } = await requireAdmin(request)
    const { id: targetUserId } = await params

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      throw Errors.notFound("User not found")
    }

    // Set period dates
    const now = new Date()
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Determine owner
    let ownerType: LedgerOwnerType = "USER"
    let ownerId = targetUserId

    if (body.planTier === "TEAM" && body.workspaceId) {
      ownerType = "WORKSPACE"
      ownerId = body.workspaceId
    }

    // Upsert subscription
    const subscription = await prisma.subscriptionState.upsert({
      where: {
        ownerType_ownerId: {
          ownerType,
          ownerId,
        },
      },
      update: {
        planTier: body.planTier as PlanTier,
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      },
      create: {
        ownerType,
        ownerId,
        planTier: body.planTier as PlanTier,
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
      },
    })

    console.log(`[Admin] Set plan for user ${targetUserId}: ${body.planTier} (ownerType: ${ownerType}, ownerId: ${ownerId})`)
    console.log(`[Admin] Subscription created/updated:`, {
      id: subscription.id,
      planTier: subscription.planTier,
      status: subscription.status,
      ownerType: subscription.ownerType,
      ownerId: subscription.ownerId,
    })

    // Ensure monthly grant is created/updated for the new plan tier
    // This will grant credits immediately if the user doesn't have a grant for this period
    // or if they upgraded (we'll handle the upgrade case by checking existing grant)
    const currentDate = new Date()
    const currentPeriodKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, "0")}`
    
    // Check if there's an existing grant for this period
    const existingGrant = await prisma.creditLedgerEntry.findFirst({
      where: {
        ownerType,
        ownerId,
        type: "MONTHLY_GRANT",
        periodKey: currentPeriodKey,
      },
    })

    // Calculate expected grant amount for new tier
    let expectedGrantAmount = 0
    if (body.planTier === "FREE") {
      expectedGrantAmount = parseFloat(process.env.FREE_MONTHLY_CREDITS || "1.0")
    } else if (body.planTier === "PRO") {
      expectedGrantAmount = 10.0
    } else if (body.planTier === "TEAM") {
      if (ownerType === "WORKSPACE") {
        const workspace = await prisma.workspace.findUnique({
          where: { id: ownerId },
          select: { seatCount: true },
        })
        expectedGrantAmount = 15.0 * (workspace?.seatCount || 1)
      } else {
        expectedGrantAmount = 15.0
      }
    }

    // If user upgraded and has an existing grant with less credits, add the difference
    if (existingGrant && existingGrant.amountCredits < expectedGrantAmount) {
      const difference = expectedGrantAmount - existingGrant.amountCredits
      await prisma.creditLedgerEntry.create({
        data: {
          ownerType,
          ownerId,
          type: "ADJUSTMENT",
          amountCredits: difference,
          ref: `plan-upgrade-${body.planTier}-${Date.now()}`,
        },
      })
      console.log(`[Admin] Added ${difference} credits as adjustment for plan upgrade to ${body.planTier}`)
    } else if (!existingGrant) {
      // No grant exists, ensure one is created
      await ensureMonthlyGrant(ownerType, ownerId, body.planTier as PlanTier)
      console.log(`[Admin] Created monthly grant for ${body.planTier} plan`)
    }

    // Log action
    await logAdminAction(adminUserId, "set_plan", "USER", targetUserId, {
      planTier: body.planTier,
      workspaceId: body.workspaceId,
    })

    return {
      success: true,
      subscription: {
        id: subscription.id,
        planTier: subscription.planTier,
        status: subscription.status,
        ownerType: subscription.ownerType,
        ownerId: subscription.ownerId,
      },
    }
  }
)

