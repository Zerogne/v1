import { z } from "zod"
import { createPostHandler } from "@/src/shared/http/route"
import { requireAdmin, logAdminAction } from "@/lib/admin-guard"
import { addTopup } from "@/lib/credits"
import { LedgerOwnerType } from "@/lib/generated/prisma"

const requestSchema = z.object({
  ownerType: z.enum(["USER", "WORKSPACE"]),
  ownerId: z.string(),
  amountCredits: z.number().positive(),
  ref: z.string().optional(),
})

export const POST = createPostHandler(
  requestSchema,
  async ({ request, body }) => {
    const { userId: adminUserId } = await requireAdmin(request)

    await addTopup(
      body.ownerType as LedgerOwnerType,
      body.ownerId,
      body.amountCredits,
      body.ref
    )

    // Log action
    await logAdminAction(adminUserId, "topup", body.ownerType, body.ownerId, {
      amountCredits: body.amountCredits,
      ref: body.ref,
    })

    return {
      success: true,
      message: `Added ${body.amountCredits} credits to ${body.ownerType} ${body.ownerId}`,
    }
  }
)

