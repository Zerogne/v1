"use client"

import { useState, useEffect, cloneElement, isValidElement } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  showSidebar?: boolean
  sidebarContent?: React.ReactNode
}

export function AppShell({ children, showSidebar = false, sidebarContent }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isProjectPage = pathname?.startsWith("/projects/")

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarOpen")
    if (saved !== null) {
      setSidebarOpen(saved === "true")
    }
  }, [])

  // Auto-close sidebar on project pages (workspace) when navigating to them
  useEffect(() => {
    if (isProjectPage) {
      setSidebarOpen(false)
    }
  }, [isProjectPage])

  // Handle manual sidebar toggle
  const handleToggleSidebar = () => {
    const newState = !sidebarOpen
    setSidebarOpen(newState)
    // Always save manual toggles to localStorage
    localStorage.setItem("sidebarOpen", String(newState))
  }

  // Save sidebar state to localStorage when not on project pages
  useEffect(() => {
    if (!isProjectPage) {
      localStorage.setItem("sidebarOpen", String(sidebarOpen))
    }
  }, [sidebarOpen, isProjectPage])

  // Clone sidebar content to pass isCollapsed prop
  const sidebarWithProps = isValidElement(sidebarContent)
    ? cloneElement(sidebarContent as React.ReactElement<any>, { isCollapsed: !sidebarOpen })
    : sidebarContent

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Main Content Area - No Navbar */}
      <div className="flex-1 flex overflow-hidden relative">
        {showSidebar && sidebarContent && (
          <>
            <div
              className={cn(
                "flex-shrink-0 border-r border-border/20 bg-[#0a0a0a] transition-all duration-300 ease-in-out overflow-hidden",
                sidebarOpen ? "w-64" : "w-16"
              )}
            >
              <div className={cn("h-full", sidebarOpen ? "w-64" : "w-16")}>
                {sidebarWithProps}
              </div>
            </div>
            <button
              onClick={handleToggleSidebar}
              className={cn(
                "absolute z-20 h-8 w-8 flex items-center justify-center rounded-r-lg border-r border-t border-b border-border bg-card hover:bg-secondary transition-all shadow-v0-md",
                sidebarOpen ? "left-64 top-8" : "left-16 top-8"
              )}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg
                className={cn(
                  "h-4 w-4 text-foreground transition-transform duration-300",
                  sidebarOpen ? "rotate-0" : "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </>
        )}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

