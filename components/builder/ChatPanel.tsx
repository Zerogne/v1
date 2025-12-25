"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Send, MessageSquare, Camera, Plus, Code2, Sparkles, X, Image as ImageIcon, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/api-client"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: string
  images?: string[] // Base64 image data URLs
}

interface ChatSession {
  id: string
  title: string
  snapshotId: string
  createdAt: string
}

interface Snapshot {
  id: string
  label: string | null
  createdAt: string
}

interface ChatPanelProps {
  projectId: string
  projectName?: string
  selectedChat: string | null
  onChatChange: (chatId: string | null) => void
  onNewChat: () => void
  onSnapshotsClick: () => void
  onSnapshotCreated?: (snapshotId: string) => void
  autoSendPrompt?: string | null
}

export function ChatPanel({
  projectId,
  projectName,
  selectedChat,
  onChatChange,
  onNewChat,
  onSnapshotsClick,
  onSnapshotCreated,
  autoSendPrompt,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [chats, setChats] = useState<ChatSession[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<string[]>([]) // Base64 image data URLs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoSendTriggeredRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadData = async () => {
      await fetchSnapshots()
    }
    loadData()
  }, [projectId])

  useEffect(() => {
    if (snapshots.length > 0) {
      fetchChats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots.length, projectId])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat)
    } else {
      setMessages([])
    }
  }, [selectedChat, projectId])

  // Auto-send prompt when chat is ready and prompt is provided
  useEffect(() => {
    if (
      autoSendPrompt &&
      selectedChat &&
      snapshots.length > 0 &&
      !isSending &&
      messages.length === 0 &&
      !autoSendTriggeredRef.current
    ) {
      autoSendTriggeredRef.current = true
      // Use a small delay to ensure everything is ready, then send directly
      const timer = setTimeout(() => {
        handleSendMessage(autoSendPrompt)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoSendPrompt, selectedChat, snapshots.length, isSending, messages.length])

  useEffect(() => {
    if (selectedChat && chats.length > 0) {
      const chat = chats.find((c) => c.id === selectedChat)
      if (chat) {
        setSelectedSnapshot(chat.snapshotId)
      }
    }
  }, [selectedChat, chats])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchChats = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/chats`)
      if (!res.ok) throw new Error("Failed to fetch chats")
      const data = await res.json()
      const chatsData = data.ok ? data.data : data
      const chatsArray = Array.isArray(chatsData) ? chatsData : []
      setChats(chatsArray)
      if (chatsArray.length > 0 && !selectedChat) {
        onChatChange(chatsArray[0].id)
      } else if (chatsArray.length === 0 && snapshots.length > 0 && !selectedChat) {
        // Auto-create a chat if none exists
        try {
          const snapshotId = snapshots[0].id
          const createRes = await fetchWithAuth(`/api/projects/${projectId}/chats`, {
            method: "POST",
            body: JSON.stringify({
              title: "Chat",
              snapshotId,
            }),
          })
          if (createRes.ok) {
            const newChatData = await createRes.json()
            const newChat = newChatData.ok ? newChatData.data : newChatData
            // Refresh chats list
            const refreshRes = await fetchWithAuth(`/api/projects/${projectId}/chats`)
            if (refreshRes.ok) {
              const refreshedData = await refreshRes.json()
              const refreshedChats = refreshedData.ok ? refreshedData.data : refreshedData
              setChats(Array.isArray(refreshedChats) ? refreshedChats : [])
              onChatChange(newChat.id)
            }
          }
        } catch (error) {
          console.error("Failed to create chat session", error)
        }
      }
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

  const fetchMessages = async (chatSessionId: string) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/chats/${chatSessionId}/messages`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const data = await res.json()
      const messagesData = data.ok ? data.data : data
      setMessages(Array.isArray(messagesData) ? messagesData : [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
    
    if (imageFiles.length === 0) {
      toast.error("Please select image files only")
      return
    }

    // Convert images to base64
    const imagePromises = imageFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result)
          } else {
            reject(new Error("Failed to read file"))
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises)
      .then((base64Images) => {
        setAttachedImages((prev) => [...prev, ...base64Images])
        toast.success(`Added ${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}`)
      })
      .catch((error) => {
        toast.error("Failed to load images")
        console.error(error)
      })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || messageInput.trim()
    const hasImages = attachedImages.length > 0
    
    if ((!messageToSend && !hasImages) || isSending) return

    // Ensure we have a snapshot first
    let snapshotId: string | null = null
    if (snapshots.length === 0) {
      // Auto-create a snapshot if none exists
      try {
        const createSnapshotRes = await fetchWithAuth(`/api/projects/${projectId}/snapshots`, {
          method: "POST",
          body: JSON.stringify({
            label: "Initial snapshot",
          }),
        })

        if (!createSnapshotRes.ok) {
          throw new Error("Failed to create snapshot")
        }

        const newSnapshotData = await createSnapshotRes.json()
        const newSnapshot = newSnapshotData.ok ? newSnapshotData.data : newSnapshotData
        snapshotId = newSnapshot.id
        
        // Refresh snapshots list
        await fetchSnapshots()
      } catch (error) {
        toast.error("Failed to create snapshot. Please try again.")
        console.error("Failed to create snapshot", error)
        return
      }
    } else {
      snapshotId = snapshots[0].id
    }

    // Ensure we have a chat session
    let chatSessionId = selectedChat
    if (!chatSessionId) {
      // Try to create a chat session if none exists
      try {
        const createRes = await fetchWithAuth(`/api/projects/${projectId}/chats`, {
          method: "POST",
          body: JSON.stringify({
            title: "Chat",
            snapshotId: snapshotId!,
          }),
        })

        if (!createRes.ok) {
          throw new Error("Failed to create chat session")
        }

        const newChatData = await createRes.json()
        const newChat = newChatData.ok ? newChatData.data : newChatData
        chatSessionId = newChat.id
        
        // Update chats list and select the new chat
        // Add the new chat to the list immediately (optimistic update)
        setChats((prev) => [newChat, ...prev])
        onChatChange(newChat.id)
        
        // Also refresh to ensure we have the latest data
        const refreshRes = await fetchWithAuth(`/api/projects/${projectId}/chats`)
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json()
          const refreshedChats = refreshedData.ok ? refreshedData.data : refreshedData
          setChats(Array.isArray(refreshedChats) ? refreshedChats : [])
        }
      } catch (error) {
        toast.error("Failed to create chat session. Please try again.")
        console.error("Failed to create chat session", error)
        return
      }
    }

    const userMessage = messageOverride || messageInput.trim()
    const imagesToSend = [...attachedImages]
    
    if (!messageOverride) {
      setMessageInput("")
      setAttachedImages([])
    }
    setIsSending(true)

    // Create AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    // Add thinking message
    const tempThinkingMessage: ChatMessage = {
      id: `temp-thinking-${Date.now()}`,
      role: "assistant",
      content: "Thinking...",
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempThinkingMessage])

    try {
      // Get current chat to find baseSnapshotId
      // Use the snapshotId we ensured exists (either from existing snapshots or newly created)
      const currentChat = chats.find((c) => c.id === chatSessionId)
      // Prefer the chat's snapshotId, but fall back to the snapshotId we ensured exists
      const baseSnapshotId = currentChat?.snapshotId || snapshotId
      
      if (!baseSnapshotId) {
        throw new Error("No snapshot available for this chat")
      }

      // Call AI API with abort signal
      const res = await fetchWithAuth(`/api/projects/${projectId}/ai/run`, {
        method: "POST",
        body: JSON.stringify({
          chatSessionId: chatSessionId!,
          baseSnapshotId: baseSnapshotId,
          message: userMessage,
          images: imagesToSend.length > 0 ? imagesToSend : undefined,
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ ok: false, error: { code: "UNKNOWN", message: "Failed to run AI" } }))
        // Handle new error format: { ok: false, error: { code, message, details? } }
        // Or old format: { error: string }
        const errorMessage = 
          (errorData.ok === false && errorData.error?.message) ||
          errorData.error?.error?.message || 
          errorData.error?.message || 
          (typeof errorData.error === "string" ? errorData.error : null) ||
          errorData.error || 
          errorData.message || 
          "Failed to run AI"
        throw new Error(errorMessage)
      }

      const data = await res.json()
      // Handle new response format: { ok: true, data: T }
      // Or old format: T (direct data)
      const result = data.ok === true ? data.data : data

      // Remove thinking message and add assistant response
      // If tools were used but no text, generate a summary message
      let assistantContent = result.assistantText
      if (!assistantContent && result.appliedTools && result.appliedTools.length > 0) {
        const successCount = result.appliedTools.filter((t: any) => t.result.ok).length
        assistantContent = `Applied ${successCount} change${successCount !== 1 ? 's' : ''} to your project.`
      } else if (!assistantContent) {
        assistantContent = "No response generated"
      }
      
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempThinkingMessage.id)
        return [
          ...filtered,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: assistantContent,
            createdAt: new Date().toISOString(),
          },
        ]
      })

      // Show applied changes card
      if (result.appliedTools && result.appliedTools.length > 0) {
        const successCount = result.appliedTools.filter((t: any) => t.result.ok).length
        const failCount = result.appliedTools.length - successCount
        
        // Check for migration creation
        const migrationTools = result.appliedTools.filter(
          (t: any) => t.toolName === "supabase_create_migration" && t.result.ok
        )
        
        if (migrationTools.length > 0) {
          // Show migration-specific notification
          migrationTools.forEach((tool: any) => {
            const migrationPath = tool.result.path
            toast.info(
              `Migration created: ${migrationPath}. Run it in Supabase SQL Editor, then click "I ran it" in Migrations Center.`,
              {
                duration: 8000,
              }
            )
          })
        }
        
        if (successCount > 0) {
          toast.success(
            `Applied ${successCount} change${successCount > 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}`,
            {
              duration: 5000,
            }
          )
        }
        
        if (failCount > 0) {
          toast.error(`${failCount} change${failCount > 1 ? "s" : ""} failed to apply`, {
            duration: 5000,
          })
        }
      } else if (!result.error) {
        toast.success("Response generated")
      }

      // Refresh snapshots and update selected snapshot
      await fetchSnapshots()
      if (result.newSnapshotId) {
        setSelectedSnapshot(result.newSnapshotId)
        if (onSnapshotCreated) {
          onSnapshotCreated(result.newSnapshotId)
        }
        // Show snapshot created notification
        const shortId = result.newSnapshotId.substring(0, 8)
        toast.info(`New snapshot created: ${shortId}...`, {
          duration: 3000,
        })
      }

      // Fetch updated messages to get persisted ones
      if (chatSessionId) {
        await fetchMessages(chatSessionId)
      }
    } catch (error) {
      // Don't show error toast if request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("Request cancelled")
        // Remove optimistic messages
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMessage.id && m.id !== tempThinkingMessage.id)
        )
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to send message")
        console.error(error)
        // Remove optimistic messages on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMessage.id && m.id !== tempThinkingMessage.id)
        )
      }
    } finally {
      setIsSending(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsSending(false)
    }
  }

  const currentChat = chats.find((c) => c.id === selectedChat)
  const currentSnapshot = snapshots.find((s) => s.id === selectedSnapshot)
  const latestSnapshot = snapshots[0]

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-border/20">
      {/* Header - Lovable Style */}
      <div className="flex-shrink-0 border-b border-border/20 bg-[#0a0a0a] px-4 py-3">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {projectName || "Project"}
          </h3>
          {latestSnapshot && (
            <p className="text-xs text-muted-foreground">
              Previewing last saved version
            </p>
          )}
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Feature List */}
          <div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>Respects prefers-reduced-motion</span>
              </li>
            </ul>
          </div>

          {/* Design System Section */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
              Design System
            </h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>Black (#0A0A0A) / White (#F5F5F5) / Cyan accent (#8AFFE0)</p>
              <p>Space Grotesk display + Inter body fonts</p>
              <p>Fluid typography with clamp()</p>
              <p>All colors via HSL semantic tokens</p>
              <p>Subtle noise texture overlay</p>
            </div>
          </div>

          {/* Sample Projects Section */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
              Sample Projects
            </h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>4 projects with generated images</p>
              <p>Filterable by category</p>
              <p>Shared element transitions between grid → detail</p>
            </div>
          </div>

          {/* What's next? Section */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
              What's next?
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>Refine Content: Replace placeholder text and images with your actual work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>Optimize Images: Convert to WebP for better performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>Add Analytics: Track visitor engagement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>Deploy: Ready to publish via Lovable's one-click deployment</span>
              </li>
            </ul>
          </div>

          {/* Action Card */}
          <Card className="p-4 border-border/20 bg-card/40 hover:bg-card/60 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Build portfolio site
                </h4>
                <p className="text-xs text-muted-foreground">
                  Previewing latest version
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => toast.info("Bookmark feature coming soon")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs"
              onClick={() => toast.info("Code view coming soon")}
            >
              <Code2 className="h-3.5 w-3.5 mr-2" />
              {"</>"} Code
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs"
              onClick={() => toast.info("Visit docs")}
            >
              Visit docs →
            </Button>
          </div>

          {/* Messages Area */}
          {messages.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/40 border border-border/20 text-foreground"
                    }`}
                  >
                    {/* Display images if present */}
                    {message.images && message.images.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {message.images.map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`Attachment ${idx + 1}`}
                            className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                          />
                        ))}
                      </div>
                    )}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start items-center gap-2">
                  <div className="bg-card/40 border border-border/20 text-foreground rounded-xl px-4 py-2.5">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStop}
                    className="h-7 px-2 text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Stop
                  </Button>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Lovable Style */}
      <div className="flex-shrink-0 border-t border-border/20 bg-[#0a0a0a] p-4">
        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedImages.map((image, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={image}
                  alt={`Attachment ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border/20"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(idx)}
                  title="Remove image"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={selectedChat ? "Ask Lovable..." : "Creating chat session..."}
            className="min-h-[44px] max-h-[200px] resize-none text-sm pr-20 bg-card/40 border-border/20 focus-visible:ring-1 focus-visible:ring-border/50"
            disabled={isSending}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => toast.info("Visual edits coming soon")}
              title="Visual edits"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => toast.info("Chat feature")}
              title="Chat"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => handleSendMessage()}
              disabled={(!messageInput.trim() && attachedImages.length === 0) || isSending}
              size="sm"
              className="h-7 w-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              title={selectedChat ? "Send" : "Creating chat session..."}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
