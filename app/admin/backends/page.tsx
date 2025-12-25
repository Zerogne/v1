"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchWithAuth } from "@/lib/api-client"

interface Backend {
  id: string
  projectId: string
  ownerType: string
  ownerId: string
  supabaseRef: string
  projectUrl: string
  status: string
  errorMessage: string | null
  createdAt: string
  project: {
    name: string
  }
  user: {
    email: string
    name: string | null
  }
}

export default function AdminBackendsPage() {
  const [backends, setBackends] = useState<Backend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBackends()
  }, [])

  const fetchBackends = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/backends")
      if (res.ok) {
        const data = await res.json()
        setBackends(data.backends || [])
      }
    } catch (error) {
      console.error("Failed to fetch backends:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (backendId: string) => {
    if (!confirm("Are you sure you want to disable this backend?")) return

    try {
      const res = await fetchWithAuth(`/api/admin/backends/${backendId}/disable`, {
        method: "POST",
      })

      if (res.ok) {
        fetchBackends()
      }
    } catch (error) {
      console.error("Failed to disable backend:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return <Badge variant="default">Ready</Badge>
      case "PROVISIONING":
        return <Badge variant="secondary">Provisioning</Badge>
      case "ERROR":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Managed Backends</h2>
        <p className="text-muted-foreground mt-2">Supabase Option C backends</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Backends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Project</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Ref</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backends.map((backend) => (
                  <tr key={backend.id} className="border-b">
                    <td className="p-2">{backend.project.name}</td>
                    <td className="p-2">{backend.user.email}</td>
                    <td className="p-2">
                      <a
                        href={backend.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {backend.supabaseRef}
                      </a>
                    </td>
                    <td className="p-2">{getStatusBadge(backend.status)}</td>
                    <td className="p-2">{new Date(backend.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      {backend.status !== "ERROR" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisable(backend.id)}
                        >
                          Disable
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

