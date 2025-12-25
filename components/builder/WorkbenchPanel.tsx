"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { FileTree } from "@/components/file-tree"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { 
  Globe, 
  Cloud, 
  Code, 
  Maximize2, 
  Plus, 
  Gift, 
  Github, 
  Zap, 
  Rocket,
  Eye,
  FileText,
  History,
  ArrowLeft,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { fetchWithAuth } from "@/lib/api-client"
import { toast } from "sonner"

interface ProjectFile {
  id: string
  path: string
  content: string
  language: string | null
}

interface Snapshot {
  id: string
  label: string | null
  createdAt: string
}

interface WorkbenchPanelProps {
  projectId: string
}

export function WorkbenchPanel({ projectId }: WorkbenchPanelProps) {
  const [viewMode, setViewMode] = useState<"preview" | "code" | "files" | "versions">("preview")
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [fileContent, setFileContent] = useState("")
  const [previewKey, setPreviewKey] = useState(0)
  const [previewIframe, setPreviewIframe] = useState<HTMLIFrameElement | null>(null)

  useEffect(() => {
    // Clear files and selected file when project changes
    setFiles([])
    setSelectedFile(null)
    setFileContent("")
    // Reset preview key when project changes to force iframe reload
    setPreviewKey((prev) => prev + 1)
    // Fetch new project data
    fetchFiles()
    fetchSnapshots()
  }, [projectId])

  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content)
    }
  }, [selectedFile])

  const fetchFiles = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/files`)
      if (!res.ok) throw new Error("Failed to fetch files")
      const data = await res.json()
      const filesData = data.ok ? data.data : data
      setFiles(Array.isArray(filesData) ? filesData : [])
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

  const handleSelectFile = (path: string) => {
    const file = files.find((f) => f.path === path)
    if (file) {
      setSelectedFile(file)
      setFileContent(file.content)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return

    try {
      const res = await fetchWithAuth(`/api/files/${selectedFile.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: fileContent }),
      })

      if (!res.ok) throw new Error("Failed to save file")

      toast.success("File saved")
      fetchFiles()
      const updatedFileData = await res.json()
      const updatedFile = updatedFileData.ok ? updatedFileData.data : updatedFileData
      setSelectedFile(updatedFile)
    } catch (error) {
      toast.error("Failed to save file")
      console.error(error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const latestSnapshot = snapshots[0]

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar - Lovable Style */}
      <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 px-3 text-xs ${viewMode === "preview" ? "bg-secondary" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 px-3 text-xs ${viewMode === "code" ? "bg-secondary" : ""}`}
            onClick={() => setViewMode("code")}
          >
            <Code className="h-3.5 w-3.5 mr-1.5" />
            Code
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => toast.info("Expand view coming soon")}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => toast.info("GitHub integration coming soon")}
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs"
            onClick={() => toast.info("Upgrade to Pro coming soon")}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upgrade
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => toast.info("Publish feature coming soon")}
          >
            <Rocket className="h-3.5 w-3.5 mr-1.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "preview" && (
          <div className="h-full bg-background overflow-hidden flex flex-col">
            {files.length > 0 && projectId ? (
              <>
                {/* Preview Controls Bar - Command Bar Style */}
                <div className="flex-shrink-0 border-b border-border/50 bg-background">
                  <div className="mx-4 my-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 h-8 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm">
                      {/* Document Icon + Path */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-foreground/70 flex-shrink-0" />
                        <span className="text-xs text-foreground/60">/</span>
                        <span className="text-xs text-foreground/80 truncate font-mono">
                          {selectedFile?.path || "preview"}
                        </span>
                      </div>
                      
                      {/* Right Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {/* Expand/Open Icon */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-secondary/50 text-foreground/70 hover:text-foreground"
                          onClick={() => {
                            const previewUrl = `/api/projects/${projectId}/preview?email=${encodeURIComponent(
                              typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : ""
                            )}&t=${Date.now()}&projectId=${projectId}&v=${previewKey}`
                            window.open(previewUrl, "_blank")
                          }}
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        
                        {/* Refresh Icon */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-secondary/50 text-foreground/70 hover:text-foreground"
                          onClick={() => {
                            setPreviewKey((prev) => prev + 1)
                            toast.success("Preview refreshed")
                          }}
                          title="Refresh Preview"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Preview Iframe */}
                <div className="flex-1 overflow-hidden">
                  <iframe
                    ref={setPreviewIframe}
                    key={`preview-${projectId}-${previewKey}-${files.length}-${files.map(f => f.path).join(',')}`}
                    src={`/api/projects/${projectId}/preview?email=${encodeURIComponent(
                      typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : ""
                    )}&t=${Date.now()}&projectId=${projectId}&v=${previewKey}`}
                    className="w-full h-full border-0"
                    title={`Project Preview - ${projectId}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                    onLoad={() => {
                      console.log(`[Preview] Iframe loaded for project: ${projectId}, files: ${files.length}`)
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <Card className="p-8 max-w-md text-center border-border/60 bg-card/60">
                  <div className="mb-4">
                    <Globe className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No files to preview
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Create some files to see the preview
                  </p>
                </Card>
              </div>
            )}
          </div>
        )}

        {viewMode === "code" && (
          <div className="h-full flex overflow-hidden">
            {/* File Tree Sidebar */}
            <div className="w-64 flex-shrink-0 border-r border-border bg-card/40">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Files
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setViewMode("files")
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-full">
                <div className="p-2">
                  <FileTree
                    files={files}
                    onSelectFile={handleSelectFile}
                    selectedPath={selectedFile?.path || null}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Code Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile ? (
                <>
                  <div className="flex-shrink-0 border-b border-border bg-card/60 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{selectedFile.path}</span>
                    <Button size="sm" onClick={handleSaveFile}>
                      Save
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="h-full w-full font-mono text-sm resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 px-6 py-4"
                      placeholder="File content..."
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a file to view or edit
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "files" && (
          <div className="h-full flex overflow-hidden">
            <div className="w-64 flex-shrink-0 border-r border-border bg-card/40">
              <div className="p-3 border-b border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Files
                </h3>
              </div>
              <ScrollArea className="h-full">
                <div className="p-2">
                  <FileTree
                    files={files}
                    onSelectFile={handleSelectFile}
                    selectedPath={selectedFile?.path || null}
                  />
                </div>
              </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile ? (
                <>
                  <div className="flex-shrink-0 border-b border-border bg-card/60 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-3 text-xs"
                          onClick={() => setViewMode("code")}
                        >
                          <Code className="h-3.5 w-3.5 mr-1.5" />
                          Code
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-3 text-xs"
                          onClick={() => toast.info("Preview for files coming soon")}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Preview
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">{selectedFile.path}</span>
                    </div>
                    <Button size="sm" onClick={handleSaveFile}>
                      Save
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="h-full w-full font-mono text-sm resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 px-6 py-4"
                      placeholder="File content..."
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a file to view or edit
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "versions" && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">Snapshots</h3>
                <p className="text-xs text-muted-foreground">
                  View and manage project snapshots
                </p>
              </div>
              {snapshots.length === 0 ? (
                <Card className="p-8 text-center border-border/60">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-sm text-muted-foreground">No snapshots yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snapshot) => (
                    <Card
                      key={snapshot.id}
                      className="p-4 border-border/60 hover:shadow-v0-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-1">
                            {snapshot.label || "Untitled Snapshot"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(snapshot.createdAt)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
