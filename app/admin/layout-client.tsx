"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchWithAuth } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/check")
      const data = await res.json()
      
      if (res.ok && data.isAdmin) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        setReason(data.reason || "You do not have admin access")
      }
    } catch (error) {
      setIsAdmin(false)
      setReason("Failed to check admin status. Please log in again.")
    }
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Checking admin access...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full">
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Admin Access Denied</h1>
            <p className="text-muted-foreground">{reason || "You do not have admin access."}</p>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">To gain admin access:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Run: <code className="bg-muted px-1 rounded">npx tsx scripts/set-admin.ts your-email@example.com</code></li>
                <li>Log out and log back in</li>
                <li>Or set ADMIN_SECRET in .env and use x-admin-secret header</li>
              </ol>
            </div>
            
            <div className="flex gap-2">
              <Link href="/dashboard" className="flex-1">
                <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                  Back to Dashboard
                </button>
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("userEmail")
                  localStorage.removeItem("isAuthenticated")
                  router.push("/login")
                }}
                className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
              >
                Log Out
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const navItems = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/workspaces", label: "Workspaces" },
    { href: "/admin/credits", label: "Credits" },
    { href: "/admin/usage", label: "AI Usage" },
    { href: "/admin/backends", label: "Backends" },
    { href: "/admin/settings", label: "Settings" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <Card className="p-4">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 rounded-md text-sm hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </Card>
          </aside>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}

