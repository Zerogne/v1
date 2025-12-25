"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchWithAuth } from "@/lib/api-client"
import { PlanBadge } from "@/components/PlanBadge"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface User {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  createdAt: string
  effectivePlanTier: "FREE" | "PRO" | "TEAM"
  creditBalance: number
  usageThisMonth: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [newPlanTier, setNewPlanTier] = useState<"FREE" | "PRO" | "TEAM">("FREE")

  useEffect(() => {
    fetchUsers()
  }, [search])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetchWithAuth(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(`Failed to fetch users: ${errorData.error || "Unknown error"}`)
        console.error("Failed to fetch users:", errorData)
      }
    } catch (error) {
      toast.error(`Failed to fetch users: ${error instanceof Error ? error.message : "Unknown error"}`)
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPlan = async () => {
    if (!selectedUser) return

    try {
      const res = await fetchWithAuth(`/api/admin/users/${selectedUser.id}/set-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: newPlanTier }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Plan updated to ${newPlanTier} for ${selectedUser.email}`)
        setPlanDialogOpen(false)
        // Refresh users list to show updated plan
        await fetchUsers()
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(`Failed to set plan: ${errorData.error || "Unknown error"}`)
        console.error("Failed to set plan:", errorData)
      }
    } catch (error) {
      toast.error(`Failed to set plan: ${error instanceof Error ? error.message : "Unknown error"}`)
      console.error("Failed to set plan:", error)
    }
  }

  const handleToggleAdmin = async (userId: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/toggle-admin`, {
        method: "POST",
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Failed to toggle admin:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Users</h2>
        <p className="text-muted-foreground mt-2">Manage users and their plans</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by email, name, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Plan</th>
                  <th className="text-left p-2">Credits</th>
                  <th className="text-left p-2">Usage (Month)</th>
                  <th className="text-left p-2">Admin</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.name || "-"}</td>
                    <td className="p-2">
                      <PlanBadge tier={user.effectivePlanTier} />
                    </td>
                    <td className="p-2">{user.creditBalance.toFixed(2)}</td>
                    <td className="p-2">{user.usageThisMonth.toFixed(2)}</td>
                    <td className="p-2">
                      {user.isAdmin ? (
                        <Badge variant="default">Admin</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setNewPlanTier(user.effectivePlanTier)
                            setPlanDialogOpen(true)
                          }}
                        >
                          Set Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAdmin(user.id)}
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Plan for {selectedUser?.email}</DialogTitle>
            <DialogDescription>Change the user's subscription plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{newPlanTier}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setNewPlanTier("FREE")}>FREE</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNewPlanTier("PRO")}>PRO</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNewPlanTier("TEAM")}>TEAM</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPlan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

