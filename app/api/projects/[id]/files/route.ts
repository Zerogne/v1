import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createFileSchema } from "@/lib/validations"
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

    const files = await prisma.projectFile.findMany({
      where: {
        projectId: id,
        isDeleted: false,
      },
      orderBy: { path: "asc" },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error("Error fetching files:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
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

    const body = await request.json()
    const data = createFileSchema.parse(body)

    // Check if file already exists
    const existing = await prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId: id,
          path: data.path,
        },
      },
    })

    if (existing && !existing.isDeleted) {
      return NextResponse.json(
        { error: "File with this path already exists" },
        { status: 409 }
      )
    }

    const file = await prisma.projectFile.upsert({
      where: existing
        ? {
            id: existing.id,
          }
        : {
            projectId_path: {
              projectId: id,
              path: data.path,
            },
          },
      update: {
        content: data.content,
        language: data.language,
        isDeleted: false,
      },
      create: {
        projectId: id,
        path: data.path,
        content: data.content,
        language: data.language,
      },
    })

    // Update project updatedAt
    await prisma.project.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      )
    }
    console.error("Error creating file:", error)
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    )
  }
}

