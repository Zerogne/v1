import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { id, chatId } = await params
    
    // Verify chat session belongs to project and user
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: chatId,
        projectId: id,
        userId,
      },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found or access denied" },
        { status: 404 }
      )
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatSessionId: chatId },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { id, chatId } = await params
    const body = await request.json()

    // Verify chat session belongs to project and user
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: chatId,
        projectId: id,
        userId,
      },
    })

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found or access denied" },
        { status: 404 }
      )
    }

    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      )
    }

    if (!["user", "assistant", "system"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user', 'assistant', or 'system'" },
        { status: 400 }
      )
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatSessionId: chatId,
        role,
        content,
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}

