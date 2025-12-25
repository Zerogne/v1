"use client"

import { AppShell } from "@/components/shell/AppShell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      credits: "100",
      features: [
        "100 credits/month",
        "Basic features",
        "Community support",
      ],
    },
    {
      name: "Pro",
      price: "$10",
      credits: "1,000",
      features: [
        "1,000 credits/month",
        "All features",
        "Priority support",
        "Advanced tools",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      credits: "Unlimited",
      features: [
        "Unlimited credits",
        "All features",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
      ],
    },
  ]

  return (
    <AppShell>
      <div className="h-full flex flex-col overflow-auto bg-background">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-5xl">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-semibold text-foreground mb-3">Pricing</h1>
              <p className="text-sm text-muted-foreground">
                Choose the plan that's right for you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.name} className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                      {plan.price !== "Custom" && (
                        <span className="text-sm text-muted-foreground">/month</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.credits} credits</p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.name === "Pro" ? "default" : "outline"}
                  >
                    {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

