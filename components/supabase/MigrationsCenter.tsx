"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Copy, Check, Clock, Database } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"

interface Migration {
  path: string
  status: "draft" | "applied" | "failed"
  createdAt: string
  appliedAt: string | null
  sqlPreview: string
}

interface MigrationsCenterProps {
  projectId: string
  chatSessionId?: string
  onMigrationApplied?: (path: string) => void
}

export function MigrationsCenter({
  projectId,
  chatSessionId,
  onMigrationApplied,
}: MigrationsCenterProps) {
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null)
  const [sqlContent, setSqlContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    loadMigrations()
  }, [projectId])

  const loadMigrations = async () => {
    setIsLoading(true)
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/supabase/migrations`)
      if (res.ok) {
        const data = await res.json()
        const migrationsData = data.ok ? data.data : data
        setMigrations(migrationsData)
      }
    } catch (error) {
      console.error("Failed to load migrations", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMigrationContent = async (path: string) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/files`)
      if (res.ok) {
        const data = await res.json()
        const files = data.ok ? data.data : data
        const file = files.find((f: { path: string }) => f.path === path)
        if (file) {
          setSqlContent(file.content)
        }
      }
    } catch (error) {
      console.error("Failed to load migration content", error)
    }
  }

  const handleViewMigration = async (migration: Migration) => {
    setSelectedMigration(migration)
    await loadMigrationContent(migration.path)
  }

  const handleCopySQL = async () => {
    if (!sqlContent) return
    await navigator.clipboard.writeText(sqlContent)
    toast.success("SQL copied to clipboard")
  }

  const handleMarkApplied = async () => {
    if (!selectedMigration) return

    setIsApplying(true)
    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/supabase/migrations/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            path: selectedMigration.path,
            chatSessionId,
          }),
        }
      )

      const data = await res.json()
      if (res.ok) {
        toast.success("Migration marked as applied")
        setSelectedMigration(null)
        await loadMigrations()
        if (onMigrationApplied) {
          onMigrationApplied(selectedMigration.path)
        }
      } else {
        toast.error(data.error?.message || "Failed to mark migration as applied")
      }
    } catch (error) {
      toast.error("Failed to mark migration as applied")
      console.error(error)
    } finally {
      setIsApplying(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: "Draft", variant: "secondary" as const, icon: Clock },
      applied: { label: "Applied", variant: "default" as const, icon: Check },
      failed: { label: "Failed", variant: "outline" as const, icon: Clock },
    }
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b border-border/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Supabase Migrations</h3>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading migrations...</p>
          ) : migrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No migrations yet</p>
          ) : (
            migrations.map((migration) => (
              <Card
                key={migration.path}
                className="p-4 border-border/20 hover:bg-card/60 transition-colors cursor-pointer"
                onClick={() => handleViewMigration(migration)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{migration.path}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(migration.createdAt).toLocaleString()}
                      {migration.appliedAt && (
                        <> • Applied: {new Date(migration.appliedAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  {getStatusBadge(migration.status)}
                </div>
                {migration.sqlPreview && (
                  <pre className="text-xs text-muted-foreground mt-2 overflow-hidden line-clamp-2">
                    {migration.sqlPreview}
                  </pre>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Migration Detail Dialog */}
      <Dialog open={!!selectedMigration} onOpenChange={(open) => !open && setSelectedMigration(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedMigration?.path}</DialogTitle>
            <DialogDescription>
              {selectedMigration?.status === "draft" && (
                <>Run this SQL in Supabase SQL Editor, then click "I ran it" below.</>
              )}
              {selectedMigration?.status === "applied" && (
                <>This migration has been applied.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <ScrollArea className="h-[400px] rounded-md border border-border/20 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  {sqlContent || "Loading..."}
                </pre>
              </ScrollArea>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySQL}
                className="flex items-center gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy SQL
              </Button>
              {selectedMigration?.status === "draft" && (
                <Button
                  size="sm"
                  onClick={handleMarkApplied}
                  disabled={isApplying}
                  className="flex items-center gap-2"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isApplying ? "Applying..." : "I ran it"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

