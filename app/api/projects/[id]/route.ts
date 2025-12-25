import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { id } = await params
    const project = await prisma.project.findFirst({
      where: { 
        id,
        userId, // Ensure user owns this project
      },
      include: {
        files: {
          where: { isDeleted: false },
        },
        snapshots: {
          orderBy: { createdAt: "desc" },
        },
        chatSessions: {
          where: { userId }, // Only include chats owned by this user
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

