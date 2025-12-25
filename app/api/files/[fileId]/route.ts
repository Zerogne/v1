import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateFileSchema } from "@/lib/validations"
import { getUserId } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { fileId } = await params
    
    // Verify file belongs to user's project
    const file = await prisma.projectFile.findUnique({
      where: { id: fileId },
      include: { project: true },
    })

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    if (file.project.userId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateFileSchema.parse(body)

    const updatedFile = await prisma.projectFile.update({
      where: { id: fileId },
      data: {
        content: data.content,
        updatedAt: new Date(),
      },
    })

    // Update project updatedAt
    await prisma.project.update({
      where: { id: updatedFile.projectId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(updatedFile)
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }
    console.error("Error updating file:", error)
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { fileId } = await params

    const file = await prisma.projectFile.findUnique({
      where: { id: fileId },
      include: { project: true },
    })

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    if (file.project.userId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    await prisma.projectFile.update({
      where: { id: fileId },
      data: { isDeleted: true },
    })

    // Update project updatedAt
    await prisma.project.update({
      where: { id: file.projectId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}

