/**
 * Supabase provisioning service
 * Handles project creation, polling, and key fetching
 */

import {
  createProject,
  waitForProjectHealthy,
  ensureApiKeys,
  CreateProjectRequest,
} from "./supabase-management-api"
import { encrypt, generateSecurePassword } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"

export interface ProvisionProjectParams {
  projectId: string
  userId: string
  projectName: string
  ownerType?: "USER" | "WORKSPACE"
  ownerId?: string
}

export interface ProvisionResult {
  success: boolean
  managedSupabaseProjectId?: string
  error?: string
}

/**
 * Provision a new Supabase project for a builder project
 */
export async function provisionSupabaseProject(
  params: ProvisionProjectParams
): Promise<ProvisionResult> {
  const { projectId, userId, projectName, ownerType = "USER", ownerId = userId } = params

  // Check if project already has a managed Supabase project
  const existing = await prisma.managedSupabaseProject.findUnique({
    where: { projectId },
  })

  if (existing) {
    if (existing.status === "PROVISIONING") {
      return {
        success: false,
        error: "Provisioning already in progress",
      }
    }
    if (existing.status === "READY") {
      return {
        success: false,
        error: "Supabase project already exists",
      }
    }
    // If ERROR, allow retry by deleting and recreating
  }

  try {
    // Check if default Supabase credentials are configured
    const defaultUrl = process.env.SUPABASE_DEFAULT_URL
    const defaultAnonKey = process.env.SUPABASE_DEFAULT_ANON_KEY

    if (defaultUrl && defaultAnonKey) {
      // Use default Supabase project (shared instance)
      // Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
      const urlMatch = defaultUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
      if (!urlMatch) {
        throw new Error("Invalid SUPABASE_DEFAULT_URL format. Expected: https://[ref].supabase.co")
      }
      const supabaseRef = urlMatch[1]

      // Create record in our DB with READY status (no provisioning needed)
      const managedProject = await prisma.managedSupabaseProject.upsert({
        where: { projectId },
        update: {
          ownerType: ownerType as "USER" | "WORKSPACE",
          ownerId,
          supabaseRef,
          projectUrl: defaultUrl,
          publishableKey: defaultAnonKey,
          secretKeyEncrypted: "", // Not available for default project
          dbPassEncrypted: "", // Not available for default project
          status: "READY",
          errorMessage: null,
          updatedAt: new Date(),
        },
        create: {
          projectId,
          ownerType: ownerType as "USER" | "WORKSPACE",
          ownerId,
          ownerUserId: userId,
          supabaseRef,
          projectUrl: defaultUrl,
          publishableKey: defaultAnonKey,
          secretKeyEncrypted: "", // Not available for default project
          dbPassEncrypted: "", // Not available for default project
          status: "READY",
        },
      })

      return {
        success: true,
        managedSupabaseProjectId: managedProject.id,
      }
    }

    // Otherwise, provision a new Supabase project via Management API
    // Get configuration from env
    const orgSlug = process.env.SUPABASE_ORG_SLUG
    if (!orgSlug) {
      throw new Error(
        "SUPABASE_ORG_SLUG environment variable is not set. Please configure Supabase provisioning in your environment variables, or set SUPABASE_DEFAULT_URL and SUPABASE_DEFAULT_ANON_KEY to use an existing project."
      )
    }

    const regionGroup = process.env.SUPABASE_REGION_GROUP || "apac"
    const instanceSize = process.env.SUPABASE_INSTANCE_SIZE || "micro"

    // Generate secure database password
    const dbPass = generateSecurePassword(32)

    // Create project request
    const createRequest: CreateProjectRequest = {
      name: `${projectName}-${projectId.slice(0, 8)}`, // Use project name + short ID
      organization_slug: orgSlug,
      db_pass: dbPass,
      region_selection: regionGroup,
      desired_instance_size: instanceSize,
    }

    // Create project in Supabase
    const supabaseProject = await createProject(createRequest)
    const projectRef = supabaseProject.ref
    const projectUrl = `https://${projectRef}.supabase.co`

    // Create record in our DB with PROVISIONING status
    const managedProject = await prisma.managedSupabaseProject.upsert({
      where: { projectId },
      update: {
        ownerType: ownerType as "USER" | "WORKSPACE",
        ownerId,
        supabaseRef: projectRef,
        projectUrl,
        status: "PROVISIONING",
        errorMessage: null,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        ownerType: ownerType as "USER" | "WORKSPACE",
        ownerId,
        ownerUserId: userId,
        supabaseRef: projectRef,
        projectUrl,
        publishableKey: "", // Will be set after provisioning
        secretKeyEncrypted: "", // Will be set after provisioning
        dbPassEncrypted: encrypt(dbPass),
        status: "PROVISIONING",
      },
    })

    // Start async provisioning (don't await - let it run in background)
    // In production, you might want to use a job queue
    provisionAsync(managedProject.id, projectRef, dbPass).catch((error) => {
      console.error(`Failed to provision Supabase project ${projectRef}:`, error)
      // Update status to ERROR
      prisma.managedSupabaseProject
        .update({
          where: { id: managedProject.id },
          data: {
            status: "ERROR",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        })
        .catch((updateError) => {
          console.error("Failed to update error status:", updateError)
        })
    })

    return {
      success: true,
      managedSupabaseProjectId: managedProject.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Async provisioning: wait for health, fetch keys, update status
 */
async function provisionAsync(
  managedProjectId: string,
  projectRef: string,
  dbPass: string
): Promise<void> {
  try {
    // Wait for project to become healthy (with timeout)
    await waitForProjectHealthy(projectRef, 300000) // 5 minutes

    // Fetch or create API keys
    const { publishableKey, secretKey } = await ensureApiKeys(projectRef)

    // Encrypt secret key
    const secretKeyEncrypted = encrypt(secretKey)

    // Update record with keys and READY status
    await prisma.managedSupabaseProject.update({
      where: { id: managedProjectId },
      data: {
        publishableKey, // Client-safe, no encryption needed
        secretKeyEncrypted,
        status: "READY",
        errorMessage: null,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    // Update status to ERROR
    await prisma.managedSupabaseProject.update({
      where: { id: managedProjectId },
      data: {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      },
    })
    throw error
  }
}

/**
 * Delete a Supabase project
 */
export async function deleteSupabaseProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
    })

    if (!managedProject) {
      return { success: false, error: "Managed Supabase project not found" }
    }

    // Try to delete via Management API
    try {
      const { deleteProject } = await import("./supabase-management-api")
      await deleteProject(managedProject.supabaseRef)
    } catch (error) {
      // If deletion fails, mark as orphaned
      console.error(`Failed to delete Supabase project ${managedProject.supabaseRef}:`, error)
      // Could add an "orphaned" status here if needed
    }

    // Delete from our DB
    await prisma.managedSupabaseProject.delete({
      where: { id: managedProject.id },
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

