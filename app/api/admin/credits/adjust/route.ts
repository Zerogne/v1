import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { LedgerOwnerType, LedgerEntryType } from "@/lib/generated/prisma"
import { Errors } from "@/src/shared/lib/errors"

const requestSchema = z.object({
  ownerType: z.enum(["USER", "WORKSPACE"]),
  ownerId: z.string(),
  amountCredits: z.number(), // Can be positive or negative
  reason: z.string().min(1),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body }) => {
    const { userId: adminUserId } = await requireAdmin(request)

    // Create adjustment entry
    await prisma.creditLedgerEntry.create({
      data: {
        ownerType: body.ownerType as LedgerOwnerType,
        ownerId: body.ownerId,
        type: "ADJUSTMENT",
        amountCredits: body.amountCredits,
        ref: `admin-adjust-${Date.now()}`,
      },
    })

    // Log action
    await logAdminAction(adminUserId, "adjust_credits", body.ownerType, body.ownerId, {
      amountCredits: body.amountCredits,
      reason: body.reason,
    })

    return {
      success: true,
      message: `Adjusted ${body.amountCredits > 0 ? "+" : ""}${body.amountCredits} credits for ${body.ownerType} ${body.ownerId}`,
    }
  }
)

