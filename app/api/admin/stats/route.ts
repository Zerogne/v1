import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Active users (last 7 days) - users who made AI requests
    const activeUsers7d = await prisma.aiUsageEvent.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    })

    // Credits spent this month
    const creditsSpentThisMonth = await prisma.creditLedgerEntry.aggregate({
      where: {
        type: "SPEND",
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        amountCredits: true,
      },
    })

    // Vendor cost and requests this month
    const usageThisMonth = await prisma.aiUsageEvent.findMany({
      where: {
        createdAt: { gte: startOfMonth },
      },
      select: {
        vendorCostUsd: true,
        modelUsed: true,
      },
    })

    const vendorCostThisMonth = usageThisMonth.reduce((sum, u) => sum + u.vendorCostUsd, 0)
    const requestsThisMonth = usageThisMonth.length
    const haikuRequests = usageThisMonth.filter((u) => u.modelUsed.includes("haiku")).length
    const sonnetRequests = usageThisMonth.filter((u) => u.modelUsed.includes("sonnet")).length

    // Backend stats
    const backends = await prisma.managedSupabaseProject.findMany({
      select: { status: true },
    })
    const backendsTotal = backends.length
    const backendsReady = backends.filter((b) => b.status === "READY").length
    const backendsError = backends.filter((b) => b.status === "ERROR").length

    // Sanity check: FREE tier users using Sonnet (should be 0)
    const freeUsers = await prisma.subscriptionState.findMany({
      where: {
        planTier: "FREE",
        status: "ACTIVE",
      },
      select: { ownerId: true, ownerType: true },
    })

    const freeUserIds = freeUsers
      .filter((s) => s.ownerType === "USER")
      .map((s) => s.ownerId)
    const freeWorkspaceIds = freeUsers
      .filter((s) => s.ownerType === "WORKSPACE")
      .map((s) => s.ownerId)

    const freeSonnetUsage = await prisma.aiUsageEvent.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        modelUsed: { contains: "sonnet" },
        OR: [
          { userId: { in: freeUserIds } },
          { workspaceId: { in: freeWorkspaceIds } },
        ],
      },
    })

    return NextResponse.json({
      activeUsers7d: activeUsers7d.length,
      creditsSpentThisMonth: Math.abs(creditsSpentThisMonth._sum.amountCredits || 0),
      vendorCostThisMonth,
      requestsThisMonth,
      haikuRequests,
      sonnetRequests,
      backendsTotal,
      backendsReady,
      backendsError,
      freeSonnetCount: freeSonnetUsage.length,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

