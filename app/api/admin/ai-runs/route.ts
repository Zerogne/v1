import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"

// Simple admin check - in production, use proper role-based auth
function isAdmin(userEmail: string | null): boolean {
  if (!userEmail) return false
  
  // Allow in development or if email is in allowed list
  if (process.env.NODE_ENV !== "production") return true
  
  const allowedEmails = process.env.ADMIN_EMAILS?.split(",") || []
  return allowedEmails.includes(userEmail.toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    // Get user email for admin check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Admin only." },
        { status: 403 }
      )
    }

    const runs = await prisma.aiRun.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        toolInvocations: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return NextResponse.json(runs)
  } catch (error) {
    console.error("Error fetching AI runs:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI runs" },
      { status: 500 }
    )
  }
}

