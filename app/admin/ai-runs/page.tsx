"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchWithAuth } from "@/lib/api-client"
// Removed date-fns dependency - using native Date formatting
import { Eye, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"

interface AiRun {
  id: string
  projectId: string
  project: {
    name: string
  }
  status: string
  model: string
  createdAt: string
  inputTokens: number | null
  outputTokens: number | null
  toolCallsCount: number
  patchFailures: number
  durationMs: number | null
  contextBytes: number | null
  contextFilesCount: number | null
  selectedFilePath: string | null
  retries: number
  error: string | null
  responseText: string | null
  toolInvocations: Array<{
    id: string
    toolName: string
    args: any
    result: any
    success: boolean | null
    durationMs: number | null
    createdAt: string
  }>
}

export default function AdminAiRunsPage() {
  const [runs, setRuns] = useState<AiRun[]>([])
  const [selectedRun, setSelectedRun] = useState<AiRun | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRuns()
  }, [])

  const fetchRuns = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/ai-runs")
      if (!res.ok) throw new Error("Failed to fetch runs")
      const data = await res.json()
      setRuns(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return <Badge className="bg-green-500/20 text-green-400">Applied</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400">Failed</Badge>
      case "running":
        return <Badge className="bg-yellow-500/20 text-yellow-400">Running</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">AI Runs</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">AI Runs</h1>
          <Button onClick={fetchRuns} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {runs.map((run) => (
            <Card
              key={run.id}
              className="p-4 hover:bg-card/80 transition-colors cursor-pointer"
              onClick={() => setSelectedRun(run)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(run.status)}
                    <span className="font-medium">{run.project.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Model: {run.model}</span>
                    {run.inputTokens && (
                      <span>Input: {run.inputTokens.toLocaleString()} tokens</span>
                    )}
                    {run.outputTokens && (
                      <span>Output: {run.outputTokens.toLocaleString()} tokens</span>
                    )}
                    <span>Tools: {run.toolCallsCount}</span>
                    {run.patchFailures > 0 && (
                      <span className="text-red-400">Patch failures: {run.patchFailures}</span>
                    )}
                    {run.durationMs && (
                      <span>Duration: {(run.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    {run.retries > 0 && (
                      <span className="text-yellow-400">Retries: {run.retries}</span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {runs.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No AI runs found</p>
          </Card>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>AI Run Details</DialogTitle>
              <DialogDescription>
                {selectedRun?.project.name} • {selectedRun?.id.substring(0, 8)}...
              </DialogDescription>
            </DialogHeader>
            {selectedRun && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Status & Metrics */}
                  <div>
                    <h3 className="font-semibold mb-2">Status & Metrics</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        {getStatusBadge(selectedRun.status)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model:</span> {selectedRun.model}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        {selectedRun.durationMs
                          ? `${(selectedRun.durationMs / 1000).toFixed(2)}s`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Retries:</span> {selectedRun.retries}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Input Tokens:</span>{" "}
                        {selectedRun.inputTokens?.toLocaleString() || "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output Tokens:</span>{" "}
                        {selectedRun.outputTokens?.toLocaleString() || "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tool Calls:</span>{" "}
                        {selectedRun.toolCallsCount}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Patch Failures:</span>{" "}
                        {selectedRun.patchFailures}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Context Bytes:</span>{" "}
                        {selectedRun.contextBytes?.toLocaleString() || "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Context Files:</span>{" "}
                        {selectedRun.contextFilesCount || "N/A"}
                      </div>
                      {selectedRun.selectedFilePath && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Selected File:</span>{" "}
                          {selectedRun.selectedFilePath}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error */}
                  {selectedRun.error && (
                    <div>
                      <h3 className="font-semibold mb-2 text-red-400">Aldaa</h3>
                      <Card className="p-3 bg-red-500/10 border-red-500/20">
                        <pre className="text-sm whitespace-pre-wrap">{selectedRun.error}</pre>
                      </Card>
                    </div>
                  )}

                  {/* Tool Invocations */}
                  {selectedRun.toolInvocations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tool Invocations</h3>
                      <div className="space-y-2">
                        {selectedRun.toolInvocations.map((tool) => (
                          <Card key={tool.id} className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm">{tool.toolName}</span>
                              {tool.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400" />
                              )}
                              {tool.durationMs && (
                                <span className="text-xs text-muted-foreground">
                                  {tool.durationMs}ms
                                </span>
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="text-muted-foreground">Args:</span>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(tool.args, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Result:</span>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(tool.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response Text */}
                  {selectedRun.responseText && (
                    <div>
                      <h3 className="font-semibold mb-2">Response Text</h3>
                      <Card className="p-3">
                        <pre className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {selectedRun.responseText.substring(0, 2000)}
                          {selectedRun.responseText.length > 2000 && "..."}
                        </pre>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

