import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createChatSessionSchema } from "@/lib/validations"
import { getUserId } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { id } = await params
    
    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id, userId },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const chats = await prisma.chatSession.findMany({
      where: { 
        projectId: id,
        userId, // Ensure user owns these chats
      },
      orderBy: { createdAt: "desc" },
      include: {
        snapshot: {
          select: {
            id: true,
            label: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { id } = await params
    const body = await request.json()
    const data = createChatSessionSchema.parse(body)

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id, userId },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Verify snapshot belongs to project
    const snapshot = await prisma.snapshot.findFirst({
      where: {
        id: data.snapshotId,
        projectId: id,
      },
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found or does not belong to this project" },
        { status: 404 }
      )
    }

    const chatSession = await prisma.chatSession.create({
      data: {
        userId,
        projectId: id,
        snapshotId: data.snapshotId,
        title: data.title,
      },
    })

    return NextResponse.json(chatSession, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      )
    }
    console.error("Error creating chat session:", error)
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 }
    )
  }
}

