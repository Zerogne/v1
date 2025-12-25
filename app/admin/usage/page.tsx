"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchWithAuth } from "@/lib/api-client"

interface UsageEvent {
  id: string
  requestId: string
  userId: string
  modelUsed: string
  inputTokens: number
  outputTokens: number
  vendorCostUsd: number
  creditsCharged: number
  createdAt: string
  user: {
    email: string
    name: string | null
  }
}

export default function AdminUsagePage() {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modelFilter, setModelFilter] = useState("")

  useEffect(() => {
    fetchUsage()
  }, [modelFilter])

  const fetchUsage = async () => {
    try {
      const params = new URLSearchParams()
      if (modelFilter) params.set("model", modelFilter)
      const res = await fetchWithAuth(`/api/admin/usage?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const isHaiku = (model: string) => model.includes("haiku")
  const isSonnet = (model: string) => model.includes("sonnet")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">AI Usage</h2>
        <p className="text-muted-foreground mt-2">Monitor AI requests and costs</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Filter by model (haiku, sonnet)..."
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Model</th>
                  <th className="text-left p-2">Tokens</th>
                  <th className="text-left p-2">Cost (USD)</th>
                  <th className="text-left p-2">Credits</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b">
                    <td className="p-2">{event.user.email}</td>
                    <td className="p-2">
                      {isHaiku(event.modelUsed) ? (
                        <Badge variant="outline">Haiku</Badge>
                      ) : isSonnet(event.modelUsed) ? (
                        <Badge variant="default">Sonnet</Badge>
                      ) : (
                        <Badge>{event.modelUsed}</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {event.inputTokens.toLocaleString()} / {event.outputTokens.toLocaleString()}
                    </td>
                    <td className="p-2">${event.vendorCostUsd.toFixed(4)}</td>
                    <td className="p-2">{event.creditsCharged.toFixed(4)}</td>
                    <td className="p-2">{new Date(event.createdAt).toLocaleString()}</td>
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

