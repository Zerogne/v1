"use client"

import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Book, Play, FileText, ExternalLink } from "lucide-react"

export default function LearnPage() {
  const tutorials = [
    {
      id: "1",
      title: "Getting Started",
      description: "Learn the basics of building with Lovable",
      type: "Tutorial",
      duration: "10 min",
      icon: Play,
    },
    {
      id: "2",
      title: "Building Your First App",
      description: "Create a complete web application from scratch",
      type: "Guide",
      duration: "30 min",
      icon: FileText,
    },
    {
      id: "3",
      title: "Advanced Features",
      description: "Master advanced techniques and best practices",
      type: "Tutorial",
      duration: "45 min",
      icon: Play,
    },
    {
      id: "4",
      title: "API Integration",
      description: "Connect your app to external services",
      type: "Guide",
      duration: "20 min",
      icon: FileText,
    },
  ]

  const resources = [
    {
      title: "Documentation",
      description: "Complete API reference and guides",
      link: "#",
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step video guides",
      link: "#",
    },
    {
      title: "Community Forum",
      description: "Get help from the community",
      link: "#",
    },
  ]

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Book className="h-6 w-6 text-foreground" />
                <h1 className="text-3xl font-semibold text-foreground">Learn</h1>
              </div>
              <p className="text-sm text-muted-foreground">Tutorials, guides, and resources to help you build better</p>
            </div>

            {/* Tutorials */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Tutorials & Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutorials.map((tutorial) => {
                  const Icon = tutorial.icon
                  return (
                    <Card key={tutorial.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-secondary rounded-lg">
                            <Icon className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{tutorial.title}</CardTitle>
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                                {tutorial.type}
                              </span>
                            </div>
                            <CardDescription className="text-xs">{tutorial.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{tutorial.duration}</span>
                          <Button variant="outline" size="sm">
                            Start
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Resources</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.map((resource, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base mb-1">{resource.title}</CardTitle>
                      <CardDescription className="text-xs">{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        Visit
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

