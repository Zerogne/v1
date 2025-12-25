import { z } from "zod"

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

export const createFileSchema = z.object({
  path: z.string().min(1, "Path is required"),
  content: z.string().default(""),
  language: z.string().optional(),
})

export const updateFileSchema = z.object({
  content: z.string(),
})

export const createSnapshotSchema = z.object({
  label: z.string().optional(),
})

export const createChatSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  snapshotId: z.string().min(1, "Snapshot ID is required"),
})

export const applyMigrationSchema = z.object({
  path: z.string().min(1, "Path is required"),
  chatSessionId: z.string().optional(),
})
