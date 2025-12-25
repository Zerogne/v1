"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  Users,
  Compass,
  Box,
  Book,
  Gift,
  Zap,
  ChevronDown,
  Mail,
  Settings,
  User,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/api-client"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description: string | null
  updatedAt: string
}

interface DashboardSidebarProps {
  isCollapsed?: boolean
}

export function DashboardSidebar({ isCollapsed = false }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("User")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    fetchProjects()
    // Get user name from localStorage
    const email = localStorage.getItem("userEmail") || ""
    setUserEmail(email)
    if (email) {
      setUserName(email.split("@")[0] || "User")
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
      const projectsData = data.ok ? data.data : data
      setProjects(Array.isArray(projectsData) ? projectsData : [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const isDashboardActive = pathname === "/dashboard"
  const isProjectActive = (projectId: string) => {
    return pathname?.startsWith(`/projects/${projectId}`)
  }

  if (isCollapsed) {
    // Icon-only sidebar
    return (
      <div className="h-full flex flex-col items-center py-4 bg-[#0a0a0a]">
        {/* Logo */}
        

        {/* Projects Icons */}
        <div className="flex flex-col gap-4 mb-4">
          <Home
            className={cn(
              "h-5 w-5 cursor-pointer transition-colors",
              isDashboardActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => router.push("/dashboard")}
          />
          <Users 
            className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
            onClick={() => toast.info("Shared projects feature coming soon")}
          />
        </div>

        {/* Resources Icons */}
        <div className="flex flex-col gap-4 mb-auto">
          <Compass 
            className={cn(
              "h-5 w-5 cursor-pointer transition-colors",
              pathname === "/discover" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => router.push("/discover")}
          />
          <Box 
            className={cn(
              "h-5 w-5 cursor-pointer transition-colors",
              pathname === "/templates" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => router.push("/templates")}
          />
          <Book 
            className={cn(
              "h-5 w-5 cursor-pointer transition-colors",
              pathname === "/learn" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => router.push("/learn")}
          />
        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col gap-3 mt-auto mb-4">
          <Mail className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        </div>
        
        {/* Profile at bottom */}
        <div className="pt-4 border-t border-border/20 w-full flex justify-center pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 cursor-pointer flex items-center justify-center hover:opacity-80 transition-opacity">
                <span className="text-white font-semibold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  localStorage.removeItem("token")
                  localStorage.removeItem("userEmail")
                  router.push("/login")
                  toast.success("Signed out successfully")
                }}
                className="text-red-500 focus:text-red-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Full sidebar
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Projects Section */}
          <div>
            <div className="space-y-1">
              <button
                onClick={() => router.push("/dashboard")}
                className={cn(
                  "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3",
                  isDashboardActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>
              
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resources
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => router.push("/discover")}
                className={cn(
                  "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3",
                  pathname === "/discover"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Compass className="h-4 w-4" />
                <span>Discover</span>
              </button>
              <button 
                onClick={() => router.push("/shared")}
                className={cn(
                  "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3",
                  pathname === "/shared"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                <span>Shared with me</span>
              </button>
              <button 
                onClick={() => router.push("/templates")}
                className={cn(
                  "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3",
                  pathname === "/templates"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Box className="h-4 w-4" />
                <span>Templates</span>
              </button>
              <button 
                onClick={() => router.push("/learn")}
                className={cn(
                  "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3",
                  pathname === "/learn"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Book className="h-4 w-4" />
                <span>Learn</span>
              </button>
            </div>
          </div>

          {/* Projects List */}
          {projects.length > 0 && (
            <div>
              <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent
              </div>
              <div className="space-y-1">
                {projects.slice(0, 5).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className={cn(
                      "w-full rounded-lg transition-colors text-left px-3 py-2 text-sm",
                      isProjectActive(project.id)
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    title={project.description || undefined}
                  >
                    <span className="truncate block">{project.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/20 space-y-2">
        <button className="w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3 text-muted-foreground hover:bg-secondary hover:text-foreground bg-secondary/30">
          <Gift className="h-4 w-4" />
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">Share Lovable</div>
            <div className="text-xs text-muted-foreground">Get 10 credits each</div>
          </div>
        </button>
        <button className="w-full rounded-lg transition-colors text-left px-3 py-2 text-sm flex items-center gap-3 text-muted-foreground hover:bg-secondary hover:text-foreground bg-secondary/30">
          <Zap className="h-4 w-4" />
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">Upgrade to Pro</div>
            <div className="text-xs text-muted-foreground">Unlock more benefits</div>
          </div>
        </button>
      </div>

      {/* Profile Section at Bottom */}
      <div className="p-4 border-t border-border/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 cursor-pointer hover:bg-secondary/30 rounded-lg p-2 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-foreground truncate">
                  {userName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {userEmail || "user@example.com"}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                localStorage.removeItem("token")
                localStorage.removeItem("userEmail")
                router.push("/login")
                toast.success("Signed out successfully")
              }}
              className="text-red-500 focus:text-red-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
