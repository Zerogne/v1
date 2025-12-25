"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWithAuth } from "@/lib/api-client"

interface Stats {
  activeUsers7d: number
  creditsSpentThisMonth: number
  vendorCostThisMonth: number
  requestsThisMonth: number
  haikuRequests: number
  sonnetRequests: number
  backendsTotal: number
  backendsReady: number
  backendsError: number
  freeSonnetCount: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || "Failed to load stats")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Admin Overview</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Admin Overview</h2>
          <p className="text-muted-foreground mt-2 text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Admin Overview</h2>
        <p className="text-muted-foreground mt-2">System statistics and monitoring</p>
      </div>

      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers7d || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits Spent</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditsSpentThisMonth?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendor Cost</CardTitle>
              <CardDescription>This month (USD)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.vendorCostThisMonth?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Requests</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requestsThisMonth || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haiku Requests</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.haikuRequests || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sonnet Requests</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sonnetRequests || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backends</CardTitle>
              <CardDescription>Total / Ready / Error</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.backendsTotal || 0} / {stats.backendsReady || 0} / {stats.backendsError || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FREE + Sonnet</CardTitle>
              <CardDescription>Should be 0 (sanity check)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats.freeSonnetCount || 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                {stats.freeSonnetCount || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No statistics available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
