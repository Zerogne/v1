"use client"

import { useEffect } from "react"

/**
 * Theme provider that applies theme on initial load
 * This prevents flash of wrong theme
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme immediately on mount
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "auto" | null
    const root = document.documentElement
    
    if (savedTheme) {
      if (savedTheme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        root.setAttribute("data-theme", prefersDark ? "dark" : "light")
      } else {
        root.setAttribute("data-theme", savedTheme)
      }
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.setAttribute("data-theme", prefersDark ? "dark" : "light")
    }

    // Listen for system theme changes when auto is selected
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem("theme")
      if (currentTheme === "auto") {
        root.setAttribute("data-theme", e.matches ? "dark" : "light")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return <>{children}</>
}

