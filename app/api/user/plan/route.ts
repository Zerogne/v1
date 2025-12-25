import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { getEffectivePlanForUser, getPlanLimits } from "@/lib/entitlements"
import { getBalance } from "@/lib/credits"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    const effectivePlan = await getEffectivePlanForUser(userId)
    const planLimits = getPlanLimits(effectivePlan.tier)
    const balance = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)

    // Get monthly grant amount for current period
    const now = new Date()
    const currentPeriodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    const monthlyGrant = await prisma.creditLedgerEntry.findFirst({
      where: {
        ownerType: effectivePlan.ownerType,
        ownerId: effectivePlan.ownerId,
        type: "MONTHLY_GRANT",
        periodKey: currentPeriodKey,
      },
    })

    // Count backends
    const backendCount = await prisma.managedSupabaseProject.count({
      where: {
        ownerType: effectivePlan.ownerType,
        ownerId: effectivePlan.ownerId,
        status: {
          in: ["PROVISIONING", "READY"],
        },
      },
    })

    return NextResponse.json({
      tier: effectivePlan.tier,
      ownerType: effectivePlan.ownerType,
      creditsRemaining: balance,
      monthlyGrant: monthlyGrant?.amountCredits || 0,
      backendCount,
      backendQuota: planLimits.backendQuota,
      limits: planLimits,
    })
  } catch (error) {
    console.error("Error fetching user plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch user plan" },
      { status: 500 }
    )
  }
}

