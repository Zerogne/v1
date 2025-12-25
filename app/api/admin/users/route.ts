import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"
import { getEffectivePlanForUser } from "@/lib/entitlements"
import { getBalance } from "@/lib/credits"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100)
    const search = searchParams.get("search") || ""
    const planTier = searchParams.get("planTier") || ""
    const isAdminFilter = searchParams.get("isAdmin")

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
      ]
    }
    if (isAdminFilter === "true") {
      where.isAdmin = true
    } else if (isAdminFilter === "false") {
      where.isAdmin = false
    }

    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    // Enrich with plan and balance info
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const effectivePlan = await getEffectivePlanForUser(user.id)
        const balance = await getBalance(effectivePlan.ownerType, effectivePlan.ownerId)

        // Get usage this month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const usageThisMonth = await prisma.aiUsageEvent.aggregate({
          where: {
            userId: user.id,
            createdAt: { gte: startOfMonth },
          },
          _sum: {
            creditsCharged: true,
          },
        })

        // Filter by planTier if specified
        if (planTier && effectivePlan.tier !== planTier) {
          return null
        }

        return {
          ...user,
          effectivePlanTier: effectivePlan.tier,
          creditBalance: balance,
          usageThisMonth: Math.abs(usageThisMonth._sum.creditsCharged || 0),
        }
      })
    )

    // Filter out nulls (from planTier filter)
    const filteredUsers = enrichedUsers.filter((u) => u !== null)

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

