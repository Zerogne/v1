import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"
import { Errors, AppError } from "@/src/shared/lib/errors"

/**
 * Require authenticated user
 * Throws AppError if user not found
 * 
 * Note: getUserId already throws Errors.unauthorized, so this is a convenience wrapper
 */
export async function requireUser(request: NextRequest): Promise<string> {
  return await getUserId(request) // getUserId already throws if not authenticated
}

/**
 * Require user owns the project
 * Throws AppError if project not found or user doesn't own it
 */
export async function requireProjectOwner(
  request: NextRequest,
  projectId: string
): Promise<{ userId: string; projectId: string }> {
  const userId = await requireUser(request)
  
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
      userId: true,
    },
  })
  
  if (!project) {
    throw Errors.projectNotFound(projectId)
  }
  
  if (project.userId !== userId) {
    throw Errors.forbidden("You do not have access to this project")
  }
  
  return { userId, projectId }
}

/**
 * Require user owns the chat session
 * Throws AppError if chat not found or user doesn't own it
 */
export async function requireChatSessionOwner(
  request: NextRequest,
  projectId: string,
  chatId: string
): Promise<{ userId: string; projectId: string; chatId: string }> {
  const { userId } = await requireProjectOwner(request, projectId)
  
  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: chatId,
      projectId,
      userId,
    },
    select: {
      id: true,
      projectId: true,
      userId: true,
    },
  })
  
  if (!chatSession) {
    throw Errors.chatSessionNotFound(chatId)
  }
  
  if (chatSession.userId !== userId || chatSession.projectId !== projectId) {
    throw Errors.forbidden("You do not have access to this chat session")
  }
  
  return { userId, projectId, chatId }
}

/**
 * Require snapshot belongs to project
 * Throws AppError if snapshot not found or doesn't belong to project
 */
export async function requireSnapshotInProject(
  request: NextRequest,
  projectId: string,
  snapshotId: string
): Promise<{ userId: string; projectId: string; snapshotId: string }> {
  const { userId } = await requireProjectOwner(request, projectId)
  
  const snapshot = await prisma.snapshot.findFirst({
    where: {
      id: snapshotId,
      projectId,
    },
    select: {
      id: true,
      projectId: true,
    },
  })
  
  if (!snapshot) {
    throw Errors.snapshotNotFound(snapshotId)
  }
  
  if (snapshot.projectId !== projectId) {
    throw Errors.forbidden("Snapshot does not belong to this project")
  }
  
  return { userId, projectId, snapshotId }
}

