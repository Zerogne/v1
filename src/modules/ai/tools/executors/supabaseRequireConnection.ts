import { prisma } from "@/lib/prisma"
import { ToolResult } from "../../providers/types"

export async function supabaseRequireConnection(
  projectId: string,
  _args: unknown
): Promise<ToolResult & { projectUrl?: string; publishableKey?: string }> {
  try {
    const managedProject = await prisma.managedSupabaseProject.findUnique({
      where: { projectId },
      select: {
        status: true,
        projectUrl: true,
        publishableKey: true,
      },
    })
    
    if (!managedProject || managedProject.status !== "READY") {
      return {
        ok: false,
        error: "Managed Supabase backend is not ready. Please create a backend first using the Supabase button in the project toolbar. The backend will be automatically provisioned.",
      }
    }
    
    return {
      ok: true,
      projectUrl: managedProject.projectUrl,
      publishableKey: managedProject.publishableKey,
      message: "Managed Supabase backend is ready",
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      }
    }
    return {
      ok: false,
      error: "Unknown error checking Supabase connection",
    }
  }
}

