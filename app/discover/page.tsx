"use client"

import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Compass, Sparkles, TrendingUp, Users } from "lucide-react"

export default function DiscoverPage() {
  const featuredProjects = [
    {
      title: "E-commerce Dashboard",
      description: "Modern shopping experience with analytics",
      category: "Dashboard",
      likes: 234,
    },
    {
      title: "Task Management App",
      description: "Collaborative task tracking and project management",
      category: "Productivity",
      likes: 189,
    },
    {
      title: "Social Media Platform",
      description: "Connect and share with friends",
      category: "Social",
      likes: 456,
    },
  ]

  const categories = [
    { name: "All", count: 120 },
    { name: "Dashboards", count: 45 },
    { name: "E-commerce", count: 32 },
    { name: "Social", count: 28 },
    { name: "Productivity", count: 15 },
  ]

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Compass className="h-6 w-6 text-foreground" />
                <h1 className="text-3xl font-semibold text-foreground">Discover</h1>
              </div>
              <p className="text-sm text-muted-foreground">Explore projects and templates created by the community</p>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category.name}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">({category.count})</span>
                </Button>
              ))}
            </div>

            {/* Featured Projects */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Featured Projects</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredProjects.map((project, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{project.title}</CardTitle>
                          <CardDescription className="text-xs">{project.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">
                          {project.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>{project.likes}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Trending Now</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredProjects.map((project, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{project.title}</CardTitle>
                          <CardDescription className="text-xs">{project.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">
                          {project.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{project.likes}</span>
                        </div>
                      </div>
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

