import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isAdmin: true },
    })

    if (!user) {
      return NextResponse.json({ isAdmin: false, reason: "User not found" }, { status: 403 })
    }

    return NextResponse.json({
      isAdmin: user.isAdmin,
      email: user.email,
      userId: user.id,
    })
  } catch (error) {
    console.error("Admin check failed:", error)
    return NextResponse.json(
      { isAdmin: false, reason: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

