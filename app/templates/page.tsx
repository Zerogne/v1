"use client"

import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Box, ArrowRight } from "lucide-react"

export default function TemplatesPage() {
  const templates = [
    {
      id: "1",
      name: "E-commerce Store",
      description: "Complete online store with shopping cart and checkout",
      category: "E-commerce",
      preview: "🛒",
    },
    {
      id: "2",
      name: "Dashboard Analytics",
      description: "Beautiful analytics dashboard with charts and metrics",
      category: "Dashboard",
      preview: "📊",
    },
    {
      id: "3",
      name: "Blog Platform",
      description: "Modern blog with markdown support and comments",
      category: "Content",
      preview: "📝",
    },
    {
      id: "4",
      name: "Task Manager",
      description: "Kanban board for project management",
      category: "Productivity",
      preview: "✅",
    },
    {
      id: "5",
      name: "Portfolio Website",
      description: "Personal portfolio with projects and contact form",
      category: "Portfolio",
      preview: "💼",
    },
    {
      id: "6",
      name: "Social Media App",
      description: "Social platform with posts, likes, and comments",
      category: "Social",
      preview: "👥",
    },
  ]

  const categories = ["All", "E-commerce", "Dashboard", "Content", "Productivity", "Portfolio", "Social"]

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Box className="h-6 w-6 text-foreground" />
                <h1 className="text-3xl font-semibold text-foreground">Templates</h1>
              </div>
              <p className="text-sm text-muted-foreground">Start your project with a pre-built template</p>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-4xl">{template.preview}</div>
                      <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">
                        {template.category}
                      </span>
                    </div>
                    <CardTitle className="text-base mb-1">{template.name}</CardTitle>
                    <CardDescription className="text-xs">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      Use Template
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

