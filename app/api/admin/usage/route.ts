import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 100)
    const modelFilter = searchParams.get("model") || ""
    const tierFilter = searchParams.get("tier") || ""
    const userIdFilter = searchParams.get("userId") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}
    if (modelFilter) {
      where.modelUsed = { contains: modelFilter, mode: "insensitive" }
    }
    if (userIdFilter) {
      where.userId = userIdFilter
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Get usage events
    const [events, total] = await Promise.all([
      prisma.aiUsageEvent.findMany({
        where,
        select: {
          id: true,
          requestId: true,
          userId: true,
          projectId: true,
          workspaceId: true,
          modelUsed: true,
          inputTokens: true,
          outputTokens: true,
          vendorCostUsd: true,
          creditsCharged: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.aiUsageEvent.count({ where }),
    ])

    // Filter by tier if specified (requires checking user's plan)
    let filteredEvents = events
    if (tierFilter) {
      const enrichedEvents = await Promise.all(
        events.map(async (event) => {
          // Get user's effective plan
          const subscription = await prisma.subscriptionState.findFirst({
            where: {
              OR: [
                { ownerType: "USER", ownerId: event.userId },
                { ownerType: "WORKSPACE", ownerId: event.workspaceId || "" },
              ],
              status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
          })

          const userTier = subscription?.planTier || "FREE"
          return { ...event, tier: userTier }
        })
      )

      filteredEvents = enrichedEvents.filter((e) => e.tier === tierFilter)
    }

    return NextResponse.json({
      events: filteredEvents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Error fetching usage:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    )
  }
}

