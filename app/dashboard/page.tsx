"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchWithAuth } from "@/lib/api-client"
import { toast } from "sonner"
import { generateProjectName } from "@/lib/project-name-generator"
import {
  Paperclip,
  ChevronDown,
  MessageSquare,
  Radio,
  ArrowUp,
  Gift,
  X,
  File,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Project {
  id: string
  name: string
  description: string | null
  updatedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [userName, setUserName] = useState("User")
  const [activeTab, setActiveTab] = useState("projects")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [projectTheme, setProjectTheme] = useState<"light" | "dark" | "auto">("auto")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProjects()
    const userEmail = localStorage.getItem("userEmail")
    if (userEmail) {
      setUserName(userEmail.split("@")[0] || "User")
    }
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetchWithAuth("/api/projects")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData?.error?.message || `Failed to fetch projects (${res.status})`
        console.error("Failed to fetch projects:", errorMessage, errorData)
        throw new Error(errorMessage)
      }
      const data = await res.json()
      // Handle new response format: { ok: true, data: [...] } or old format: [...]
      const projectsData = data.ok ? data.data : data
      setProjects(Array.isArray(projectsData) ? projectsData : [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateProject = async () => {
    if (!input.trim()) {
      toast.error("Please describe what you want to build")
      return
    }

    setIsCreating(true)

    try {
      // Build the prompt with theme preference
      let prompt = input.trim()
      if (projectTheme !== "auto") {
        prompt = `${prompt}\n\nTheme: ${projectTheme === "light" ? "Light theme" : "Dark theme"}`
      }
      
      // Generate project name from user's message
      const projectName = generateProjectName(input.trim())
      
      // 1. Create project
      const projectRes = await fetchWithAuth("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName,
          description: prompt,
        }),
      })

      if (!projectRes.ok) throw new Error("Failed to create project")
      const projectData = await projectRes.json()
      const project = projectData.ok ? projectData.data : projectData

      // 2. Create initial snapshot
      const snapshotRes = await fetchWithAuth(`/api/projects/${project.id}/snapshots`, {
        method: "POST",
        body: JSON.stringify({
          label: "Initial snapshot",
        }),
      })

      if (!snapshotRes.ok) throw new Error("Failed to create snapshot")
      const snapshotData = await snapshotRes.json()
      const snapshot = snapshotData.ok ? snapshotData.data : snapshotData

      // 3. Create chat session
      const chatRes = await fetchWithAuth(`/api/projects/${project.id}/chats`, {
        method: "POST",
        body: JSON.stringify({
          title: "Chat 1",
          snapshotId: snapshot.id,
        }),
      })

      if (!chatRes.ok) throw new Error("Failed to create chat session")
      const chatData = await chatRes.json()
      const chatSession = chatData.ok ? chatData.data : chatData

      // 4. Send the initial prompt to AI (with theme preference)
      toast.success("Project created, sending prompt to AI...")
      setInput("")
      setAttachedFiles([]) // Clear attached files after creating project
      
      // Navigate to project with chat session and prompt ready
      router.push(`/projects/${project.id}?chatId=${chatSession.id}&prompt=${encodeURIComponent(prompt)}`)
    } catch (error) {
      toast.error("Failed to create project")
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a2e] to-[#ff006e] opacity-90" />
        
        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto">
          {/* Main Input Section - Centered in viewport */}
          <div className="flex items-center justify-center px-8 min-h-[calc(100vh-60px)]">
            <div className="w-full max-w-2xl mx-auto">
              <h1 className="text-5xl font-semibold text-foreground mb-10 text-center tracking-tight">
                Let's create, {userName}
              </h1>

              <div className="relative">
                <div className="relative bg-card/90 backdrop-blur-md rounded-3xl border border-border/50 shadow-v0-lg overflow-hidden">
                  {/* Attached Files Display */}
                  {attachedFiles.length > 0 && (
                    <div className="px-4 pt-3 pb-2 border-b border-border/20">
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/50 rounded-lg text-xs border border-border/30"
                          >
                            <File className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground max-w-[200px] truncate" title={file.name}>
                              {file.name}
                            </span>
                            <button
                              onClick={() => {
                                setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
                                toast.info("File removed")
                              }}
                              className="h-4 w-4 rounded flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleCreateProject()
                      }
                    }}
                    placeholder="Ask Lovable to create a web app that..."
                    className={`text-base rounded-3xl border-0 bg-transparent pr-32 pl-6 focus-visible:ring-0 focus-visible:outline-none placeholder:text-sm placeholder:text-muted-foreground/70 ${
                      attachedFiles.length > 0 ? "h-16 pb-2 pt-3" : "h-20 pb-12 pt-3"
                    }`}
                    disabled={isCreating}
                  />
                  <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <button 
                        onClick={() => {
                          fileInputRef.current?.click()
                        }}
                        className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95 transition-all duration-150"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>Attach</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            const newFiles = Array.from(e.target.files)
                            setAttachedFiles((prev) => [...prev, ...newFiles])
                            toast.success(`Added ${newFiles.length} file${newFiles.length > 1 ? "s" : ""}`)
                            // Reset input so same file can be selected again
                            e.target.value = ""
                          }
                        }}
                        multiple
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95 transition-all duration-150">
                            <span>Theme</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem 
                            onClick={() => {
                              setProjectTheme("light")
                              toast.info("Project will use light theme")
                            }}
                            className={projectTheme === "light" ? "bg-accent" : ""}
                          >
                            Light
                            {projectTheme === "light" && " ✓"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setProjectTheme("dark")
                              toast.info("Project will use dark theme")
                            }}
                            className={projectTheme === "dark" ? "bg-accent" : ""}
                          >
                            Dark
                            {projectTheme === "dark" && " ✓"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setProjectTheme("auto")
                              toast.info("Project theme will match system preference")
                            }}
                            className={projectTheme === "auto" ? "bg-accent" : ""}
                          >
                            Auto
                            {projectTheme === "auto" && " ✓"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      
                      <button
                        onClick={handleCreateProject}
                        disabled={!input.trim() || isCreating}
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-card border border-border/60 text-foreground hover:bg-secondary/60 hover:border-border active:scale-95 transition-all duration-150 shadow-v0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel - Scrollable below, showing just a tip */}
          <div className="px-4 md:px-6 lg:px-8 pb-12 -mt-12">
            {/* Tip preview - only top portion visible */}
            <div className="h-16 overflow-hidden pointer-events-none">
              <div className="max-w-6xl mx-auto px-6 md:px-8 py-4 bg-card/90 backdrop-blur-md border-t border-border/50 shadow-v0-lg rounded-t-xl">
                <div className="h-4"></div>
              </div>
            </div>
            {/* Full panel - scrollable content */}
            <div className="max-w-6xl mx-auto px-6 md:px-8 py-6 bg-card/90 backdrop-blur-md border-t border-border/50 shadow-v0-lg rounded-t-xl -mt-16 pt-4">
              <div className="flex items-center justify-between mb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-transparent">
                    <TabsTrigger
                      value="projects"
                      className="data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                    >
                      My projects
                    </TabsTrigger>
                    <TabsTrigger
                      value="templates"
                      className="data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                    >
                      Templates
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Browse all →
                </button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="projects" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.slice(0, 3).map((project) => (
                      <Card
                        key={project.id}
                        className="h-48 cursor-pointer hover:shadow-v0-md hover:-translate-y-0.5 transition-all duration-200 border-border/60 bg-card/70 backdrop-blur-sm group rounded-xl"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <div className="p-4 h-full flex flex-col">
                          <h3 className="font-medium text-foreground mb-2 truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                    {projects.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                        No projects yet. Create your first project above!
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="templates" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="h-48 cursor-pointer hover:shadow-v0-md transition-all border-border/60 bg-card/60 backdrop-blur-sm rounded-xl">
                      <div className="p-4 h-full flex items-center justify-center text-muted-foreground text-sm">
                        Templates coming soon
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
