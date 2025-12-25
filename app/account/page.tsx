"use client"

import { useEffect, useState } from "react"
import { PlanBadge } from "@/components/PlanBadge"
import { CreditMeter } from "@/components/CreditMeter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWithAuth } from "@/lib/api-client"

interface PlanInfo {
  tier: "FREE" | "PRO" | "TEAM"
  ownerType: "USER" | "WORKSPACE"
  creditsRemaining: number
  monthlyGrant: number
  backendCount: number
  backendQuota: number
  limits: {
    maxInputTokens: number
    maxOutputTokens: number
    maxContextFiles: number
    backendAllowed: boolean
    backendQuota: number
  }
}

export default function AccountPage() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlanInfo = async () => {
      try {
        const res = await fetchWithAuth("/api/user/plan")
        if (res.ok) {
          const data = await res.json()
          setPlanInfo(data)
        }
      } catch (error) {
        console.error("Failed to fetch plan info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlanInfo()
  }, [])

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  if (!planInfo) {
    return <div className="container mx-auto p-8">Failed to load plan information</div>
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Account & Billing</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription tier and limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <PlanBadge tier={planInfo.tier} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Owner</span>
                <span className="text-sm">{planInfo.ownerType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max Context Files</span>
                <span className="text-sm">{planInfo.limits.maxContextFiles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max Input Tokens</span>
                <span className="text-sm">{planInfo.limits.maxInputTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max Output Tokens</span>
                <span className="text-sm">{planInfo.limits.maxOutputTokens.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <CreditMeter
          creditsRemaining={planInfo.creditsRemaining}
          monthlyGrant={planInfo.monthlyGrant}
          tier={planInfo.tier}
        />

        {planInfo.limits.backendAllowed && (
          <Card>
            <CardHeader>
              <CardTitle>Backend Quota</CardTitle>
              <CardDescription>Managed Supabase backends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {planInfo.backendCount} / {planInfo.backendQuota} backends
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${(planInfo.backendCount / planInfo.backendQuota) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

