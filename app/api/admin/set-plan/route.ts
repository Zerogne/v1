import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { Errors } from "@/src/shared/lib/errors"
import { PlanTier, LedgerOwnerType } from "@/lib/generated/prisma"

const requestSchema = z.object({
  userId: z.string().optional(), // If not provided, uses current user
  ownerType: z.enum(["USER", "WORKSPACE"]).default("USER"),
  ownerId: z.string().optional(), // If not provided, uses userId
  planTier: z.enum(["FREE", "PRO", "TEAM"]),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body }) => {
    const { userId: adminUserId } = await requireAdmin(request)
    const currentUserId = adminUserId
    const targetUserId = body.userId || currentUserId
    const ownerType = body.ownerType || "USER"
    const ownerId = body.ownerId || targetUserId

    // Set period dates (current month)
    const now = new Date()
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Upsert subscription state
    const subscription = await prisma.subscriptionState.upsert({
      where: {
        ownerType_ownerId: {
          ownerType: ownerType as LedgerOwnerType,
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
        ownerType: ownerType as LedgerOwnerType,
        ownerId,
        planTier: body.planTier as PlanTier,
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
      },
    })

    // Log action
    await logAdminAction(adminUserId, "set_plan", ownerType, ownerId, {
      planTier: body.planTier,
    })

    return {
      success: true,
      subscription,
    }
  }
)

