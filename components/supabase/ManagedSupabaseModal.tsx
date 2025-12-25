"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"

interface ManagedSupabaseModalProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

interface ManagedSupabaseStatus {
  status: "NONE" | "PROVISIONING" | "READY" | "ERROR"
  projectUrl: string | null
  publishableKey: string | null
  supabaseRef: string | null
  errorMessage: string | null
  createdAt?: string
  updatedAt?: string
}

export function ManagedSupabaseModal({
  projectId,
  open,
  onOpenChange,
  onUpdated,
}: ManagedSupabaseModalProps) {
  const [status, setStatus] = useState<ManagedSupabaseStatus | null>(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Load status when modal opens
  useEffect(() => {
    if (open) {
      loadStatus()
      // Poll for status updates if provisioning
      const interval = setInterval(() => {
        if (status?.status === "PROVISIONING") {
          loadStatus()
        }
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(interval)
    }
  }, [open, status?.status])

  const loadStatus = async () => {
    try {
      const res = await fetchWithAuth(
        `/api/integrations/supabase/status?projectId=${projectId}`
      )
      if (res.ok) {
        const data = await res.json()
        const statusData = data.ok ? data.data : data
        setStatus(statusData)
        if (onUpdated && statusData.status !== "PROVISIONING") {
          onUpdated()
        }
      }
    } catch (error) {
      console.error("Failed to load Supabase status", error)
    }
  }

  const handleProvision = async () => {
    setIsProvisioning(true)
    try {
      const res = await fetchWithAuth("/api/integrations/supabase/provision", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      })

      const data = await res.json()
      const result = data.ok ? data.data : data

      if (res.ok) {
        toast.success("Backend provisioning started. This may take a few minutes.")
        await loadStatus()
      } else {
        toast.error(result.error?.message || "Failed to provision backend")
      }
    } catch (error) {
      toast.error("Failed to provision backend")
      console.error(error)
    } finally {
      setIsProvisioning(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this backend? This action cannot be undone."
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetchWithAuth("/api/integrations/supabase/delete", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      })

      const data = await res.json()
      const result = data.ok ? data.data : data

      if (res.ok) {
        toast.success("Backend deleted successfully")
        await loadStatus()
        if (onUpdated) {
          onUpdated()
        }
      } else {
        toast.error(result.error?.message || "Failed to delete backend")
      }
    } catch (error) {
      toast.error("Failed to delete backend")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusBadge = () => {
    if (!status) return null
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline" }
    > = {
      NONE: { label: "Not Created", variant: "secondary" },
      PROVISIONING: { label: "Provisioning...", variant: "outline" },
      READY: { label: "Ready", variant: "default" },
      ERROR: { label: "Error", variant: "outline" },
    }
    const config = statusMap[status.status] || statusMap.NONE
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Managed Supabase Backend
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            Automatically provisioned Supabase backend for your project. No manual setup required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!status || status.status === "NONE" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a fully managed Supabase backend for your project. This will automatically
                provision a new Supabase project and configure it for use.
              </p>
              <Button
                onClick={handleProvision}
                disabled={isProvisioning}
                className="w-full"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Managed Backend"
                )}
              </Button>
            </div>
          ) : status.status === "PROVISIONING" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Your backend is being provisioned. This usually takes 2-5 minutes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Project Reference: {status.supabaseRef || "..."}
              </p>
            </div>
          ) : status.status === "ERROR" ? (
            <div className="space-y-4">
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">Provisioning Failed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {status.errorMessage || "Unknown error occurred"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleProvision} variant="outline" className="flex-1">
                  Retry
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : status.status === "READY" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Project URL</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      status.projectUrl &&
                      copyToClipboard(status.projectUrl, "Project URL")
                    }
                    className="h-7"
                  >
                    {copied === "Project URL" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <div className="rounded-md bg-secondary/50 p-3 font-mono text-xs">
                  {status.projectUrl}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Publishable Key</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      status.publishableKey &&
                      copyToClipboard(status.publishableKey, "Publishable Key")
                    }
                    className="h-7"
                  >
                    {copied === "Publishable Key" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <div className="rounded-md bg-secondary/50 p-3 font-mono text-xs break-all">
                  {status.publishableKey}
                </div>
                <p className="text-xs text-muted-foreground">
                  This key is safe to use in client-side code. Use it with your Supabase client.
                </p>
              </div>

              <div className="pt-4 border-t border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    Environment variables for your project:
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const envVars = `NEXT_PUBLIC_SUPABASE_URL=${status.projectUrl}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${status.publishableKey}`
                      copyToClipboard(envVars, "Environment Variables")
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    {copied === "Environment Variables" ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="rounded-md bg-secondary/50 p-3 space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL=</span>
                    <span className="text-foreground">{status.projectUrl}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY=</span>
                    <span className="text-foreground">{status.publishableKey}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add these to your project's <code className="px-1 py-0.5 bg-secondary rounded text-xs">.env.local</code> file
                </p>
              </div>

              <div className="pt-4 border-t border-border/20">
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Backend
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will delete the Supabase project and all its data. This action cannot be
                  undone.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

