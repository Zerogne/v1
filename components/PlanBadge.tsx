"use client"

import { Badge } from "@/components/ui/badge"

type PlanTier = "FREE" | "PRO" | "TEAM"

interface PlanBadgeProps {
  tier: PlanTier
  className?: string
}

export function PlanBadge({ tier, className }: PlanBadgeProps) {
  const variants: Record<PlanTier, { label: string; variant: "default" | "secondary" | "outline" }> = {
    FREE: { label: "Free", variant: "outline" },
    PRO: { label: "Pro", variant: "default" },
    TEAM: { label: "Team", variant: "secondary" },
  }

  const { label, variant } = variants[tier]

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

