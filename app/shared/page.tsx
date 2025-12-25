"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, User } from "lucide-react"
import { fetchWithAuth } from "@/lib/api-client"

interface SharedProject {
  id: string
  name: string
  description: string | null
  owner: {
    name: string | null
    email: string
  }
  sharedAt: string
}

export default function SharedPage() {
  const [projects, setProjects] = useState<SharedProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSharedProjects()
  }, [])

  const fetchSharedProjects = async () => {
    try {
      // TODO: Replace with actual API endpoint when implemented
      // const res = await fetchWithAuth("/api/projects/shared")
      // if (res.ok) {
      //   const data = await res.json()
      //   setProjects(data)
      // }
      
      // For now, show empty state
      setProjects([])
    } catch (error) {
      console.error("Failed to fetch shared projects:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Loading shared projects...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-foreground" />
                <h1 className="text-3xl font-semibold text-foreground">Shared with me</h1>
              </div>
              <p className="text-sm text-muted-foreground">Projects that have been shared with you</p>
            </div>

            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No shared projects</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Projects that are shared with you will appear here. Ask a team member to share a project with you to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base mb-1">{project.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Shared by {project.owner.name || project.owner.email}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

