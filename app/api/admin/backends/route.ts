import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100)
    const statusFilter = searchParams.get("status") || ""

    const skip = (page - 1) * pageSize

    const where: any = {}
    if (statusFilter) {
      where.status = statusFilter
    }

    const [backends, total] = await Promise.all([
      prisma.managedSupabaseProject.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          ownerType: true,
          ownerId: true,
          ownerUserId: true,
          supabaseRef: true,
          projectUrl: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              name: true,
            },
          },
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
      prisma.managedSupabaseProject.count({ where }),
    ])

    return NextResponse.json({
      backends,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Error fetching backends:", error)
    return NextResponse.json(
      { error: "Failed to fetch backends" },
      { status: 500 }
    )
  }
}

