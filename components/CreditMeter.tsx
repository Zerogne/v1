"use client"

// Progress component - using a simple div for now
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CreditMeterProps {
  creditsRemaining: number
  monthlyGrant?: number
  tier: "FREE" | "PRO" | "TEAM"
}

export function CreditMeter({ creditsRemaining, monthlyGrant, tier }: CreditMeterProps) {
  const maxCredits = monthlyGrant || (tier === "FREE" ? 1 : tier === "PRO" ? 10 : 15)
  const percentage = maxCredits > 0 ? Math.min((creditsRemaining / maxCredits) * 100, 100) : 0

  const getStatusColor = () => {
    if (creditsRemaining <= 0) return "destructive"
    if (creditsRemaining < maxCredits * 0.2) return "destructive"
    if (creditsRemaining < maxCredits * 0.5) return "default"
    return "default"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits</CardTitle>
        <CardDescription>
          {tier === "FREE"
            ? "Monthly AI credits"
            : tier === "PRO"
            ? "Monthly AI credits ($10 value)"
            : "Workspace pooled credits"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{creditsRemaining.toFixed(2)} credits</span>
            {monthlyGrant && (
              <span className="text-muted-foreground">
                {monthlyGrant.toFixed(2)} / month
              </span>
            )}
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {creditsRemaining <= 0 && (
            <p className="text-sm text-destructive mt-2">
              Out of credits. {tier === "FREE" ? "Upgrade to Pro" : "Top-up coming soon"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

