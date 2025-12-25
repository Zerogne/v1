"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { ChatPanel } from "@/components/builder/ChatPanel"
import { WorkbenchPanel } from "@/components/builder/WorkbenchPanel"
import { ManagedSupabaseModal } from "@/components/supabase/ManagedSupabaseModal"
import { MigrationsCenter } from "@/components/supabase/MigrationsCenter"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"

interface Project {
  id: string
  name: string
  description: string | null
}

interface Snapshot {
  id: string
  label: string | null
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  snapshotId: string
  createdAt: string
}

export default function ProjectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [newSnapshotDialogOpen, setNewSnapshotDialogOpen] = useState(false)
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false)
  const [newSnapshotLabel, setNewSnapshotLabel] = useState("")
  const [newChatTitle, setNewChatTitle] = useState("")
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [autoSendPrompt, setAutoSendPrompt] = useState<string | null>(null)
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false)
  const [migrationsViewOpen, setMigrationsViewOpen] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<{
    status: string
    projectUrl: string | null
    publishableKey: string | null
  } | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchSnapshots()
      fetchSupabaseStatus()
      
      // Check for prompt in URL params (from dashboard)
      const chatId = searchParams.get("chatId")
      const prompt = searchParams.get("prompt")
      
      if (chatId) {
        setSelectedChat(chatId)
      }
      
      if (prompt) {
        setAutoSendPrompt(prompt)
        // Clear URL params
        window.history.replaceState({}, "", `/projects/${projectId}`)
        // Clear the prompt after a delay to allow ChatPanel to use it
        setTimeout(() => {
          setAutoSendPrompt(null)
        }, 2000)
      }
    }
  }, [projectId, searchParams])

  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetchWithAuth(
        `/api/integrations/supabase/status?projectId=${projectId}`
      )
      if (res.ok) {
        const data = await res.json()
        const statusData = data.ok ? data.data : data
        setSupabaseStatus(statusData)
      }
    } catch (error) {
      console.error("Failed to fetch Supabase status", error)
    }
  }

  const fetchProject = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      const data = await res.json()
      const projectData = data.ok ? data.data : data
      setProject(projectData)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchSnapshots = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/snapshots`)
      if (!res.ok) throw new Error("Failed to fetch snapshots")
      const data = await res.json()
      const snapshotsData = data.ok ? data.data : data
      setSnapshots(Array.isArray(snapshotsData) ? snapshotsData : [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateSnapshot = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/snapshots`, {
        method: "POST",
        body: JSON.stringify({
          label: newSnapshotLabel || undefined,
        }),
      })

      if (!res.ok) throw new Error("Failed to create snapshot")

      toast.success("Snapshot created")
      setNewSnapshotDialogOpen(false)
      setNewSnapshotLabel("")
      fetchSnapshots()
    } catch (error) {
      toast.error("Failed to create snapshot")
      console.error(error)
    }
  }

  const handleCreateChat = async () => {
    if (!newChatTitle.trim()) {
      toast.error("Chat title is required")
      return
    }

    const snapshotId = snapshots[0]?.id
    if (!snapshotId) {
      toast.error("Please create a snapshot first")
      return
    }

    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/chats`, {
        method: "POST",
        body: JSON.stringify({
          title: newChatTitle,
          snapshotId,
        }),
      })

      if (!res.ok) throw new Error("Failed to create chat session")

      const newChatData = await res.json()
      const newChat = newChatData.ok ? newChatData.data : newChatData
      toast.success("Chat session created")
      setNewChatDialogOpen(false)
      setNewChatTitle("")
      setSelectedChat(newChat.id)
    } catch (error) {
      toast.error("Failed to create chat session")
      console.error(error)
    }
  }

  const getSupabaseBadge = () => {
    if (!supabaseStatus) return null
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline" }
    > = {
      NONE: { label: "Not Created", variant: "secondary" },
      PROVISIONING: { label: "Provisioning...", variant: "outline" },
      READY: { label: "Ready", variant: "default" },
      ERROR: { label: "Error", variant: "outline" },
    }
    const config = statusMap[supabaseStatus.status] || statusMap.NONE
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex overflow-hidden bg-background">
        {/* Left: Chat Panel */}
        <div className="w-[480px] flex-shrink-0">
          <ChatPanel
            projectId={projectId}
            projectName={project?.name}
            selectedChat={selectedChat}
            onChatChange={setSelectedChat}
            onNewChat={() => setNewChatDialogOpen(true)}
            onSnapshotsClick={() => setNewSnapshotDialogOpen(true)}
            onSnapshotCreated={(snapshotId) => {
              fetchSnapshots()
            }}
            autoSendPrompt={autoSendPrompt}
          />
        </div>

        {/* Right: Workbench Panel or Migrations */}
        <div className="flex-1 overflow-hidden">
          {migrationsViewOpen ? (
            <MigrationsCenter
              projectId={projectId}
              chatSessionId={selectedChat || undefined}
              onMigrationApplied={() => {
                // Refresh chat messages to show system message
                // This will be handled by ChatPanel
              }}
            />
          ) : (
            <WorkbenchPanel projectId={projectId} />
          )}
        </div>
      </div>

      {/* Supabase Toolbar Button (floating) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSupabaseModalOpen(true)}
          className="flex items-center gap-2 shadow-lg"
        >
          <Database className="h-4 w-4" />
          Supabase
          {getSupabaseBadge()}
        </Button>
        {supabaseStatus?.status === "READY" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMigrationsViewOpen(!migrationsViewOpen)}
            className="flex items-center gap-2 shadow-lg"
          >
            <Database className="h-4 w-4" />
            {migrationsViewOpen ? "Hide" : "Show"} Migrations
          </Button>
        )}
      </div>

      {/* New Snapshot Dialog */}
      <Dialog open={newSnapshotDialogOpen} onOpenChange={setNewSnapshotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Save the current state of all files as a snapshot
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Snapshot label (optional)"
              value={newSnapshotLabel}
              onChange={(e) => setNewSnapshotLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSnapshot()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSnapshotDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSnapshot}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Chat Session</DialogTitle>
            <DialogDescription>
              Create a new chat session linked to{" "}
              {snapshots[0]
                ? `snapshot: ${snapshots[0].label || "latest"}`
                : "the latest snapshot"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Chat title"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateChat()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChat}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Managed Supabase Modal */}
      <ManagedSupabaseModal
        projectId={projectId}
        open={supabaseModalOpen}
        onOpenChange={setSupabaseModalOpen}
        onUpdated={() => {
          fetchSupabaseStatus()
        }}
      />
    </AppShell>
  )
}
