import { z } from "zod"

// File denylist - sensitive files that should not be edited
const DENYLIST = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  "schema.prisma",
  "prisma/schema.prisma",
  ".git/config",
  ".gitignore",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "node_modules",
  ".next",
  ".vercel",
  ".cursor",
  ".vscode",
  "dev.db",
  "*.db",
]

/**
 * Normalize and sanitize file path
 * - Trims whitespace
 * - Normalizes slashes (backslash to forward slash)
 * - Removes leading/trailing slashes
 * - Collapses multiple slashes
 */
function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
}

/**
 * Validate and sanitize file path
 * - Rejects path traversal (..)
 * - Rejects absolute paths (/ or \)
 * - Rejects empty paths
 * - Normalizes path
 * - Checks denylist
 */
function validatePath(path: string): { valid: boolean; normalized?: string; error?: string } {
  // Normalize first
  const normalized = normalizePath(path)
  
  // Reject empty
  if (!normalized) {
    return { valid: false, error: "Path cannot be empty" }
  }
  
  // Reject path traversal
  if (normalized.includes("..")) {
    return { valid: false, error: "Path cannot contain '..'" }
  }
  
  // Reject absolute paths (should already be normalized, but double-check)
  if (normalized.startsWith("/") || normalized.startsWith("\\")) {
    return { valid: false, error: "Path must be relative to project root" }
  }
  
  // Reject Windows drive letters (C:, D:, etc.)
  if (/^[a-zA-Z]:/.test(normalized)) {
    return { valid: false, error: "Path cannot contain drive letters" }
  }
  
  // Check denylist (case-insensitive)
  const lowerPath = normalized.toLowerCase()
  for (const denied of DENYLIST) {
    const lowerDenied = denied.toLowerCase()
    // Check exact match or if path contains denied pattern
    if (lowerPath === lowerDenied || lowerPath.includes(`/${lowerDenied}/`) || lowerPath.endsWith(`/${lowerDenied}`)) {
      return { valid: false, error: `Path is protected: ${denied}` }
    }
  }
  
  // Reject paths that are too long (prevent abuse)
  if (normalized.length > 500) {
    return { valid: false, error: "Path is too long (max 500 characters)" }
  }
  
  return { valid: true, normalized }
}

// Path validation schema with enhanced sanitization
const pathSchema = z
  .string()
  .min(1, "Path is required")
  .max(500, "Path is too long (max 500 characters)")
  .refine(
    (path) => {
      const result = validatePath(path)
      return result.valid
    },
    {
      message: "Invalid path: must be project-relative, not contain '..', and not be a protected file",
    }
  )
  .transform((path) => {
    // Always return normalized path
    const result = validatePath(path)
    return result.normalized || path
  })

export const createFileSchema = z.object({
  path: pathSchema,
  content: z.string().max(300_000, "Content too large (max 300,000 chars)"),
  language: z.string().optional(),
})

export const updateFileSchema = z.object({
  path: pathSchema,
  content: z.string().max(300_000, "Content too large (max 300,000 chars)"),
})

export const applyPatchSchema = z.object({
  path: pathSchema,
  patch: z.string().max(100_000, "Patch too large (max 100,000 chars)"),
})

export const deleteFileSchema = z.object({
  path: pathSchema,
})

export const renameFileSchema = z.object({
  oldPath: pathSchema,
  newPath: pathSchema,
})

