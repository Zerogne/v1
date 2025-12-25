import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { snapshotId } = await params
    
    // Verify snapshot belongs to user's project
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
      include: { project: true },
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      )
    }

    if (snapshot.project.userId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const files = await prisma.snapshotFile.findMany({
      where: { snapshotId },
      orderBy: { path: "asc" },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error("Error fetching snapshot files:", error)
    return NextResponse.json(
      { error: "Failed to fetch snapshot files" },
      { status: 500 }
    )
  }
}

