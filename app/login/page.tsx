"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    setIsLoading(true)
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      let data
      try {
        data = await res.json()
      } catch (parseError) {
        console.error("Failed to parse response:", parseError)
        toast.error("Failed to log in - invalid response from server")
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to log in")
        setIsLoading(false)
        return
      }

      // Verify we have user data
      if (!data.user || !data.user.email) {
        console.error("Invalid response data:", data)
        toast.error("Invalid response from server")
        setIsLoading(false)
        return
      }

      // Store user data for authentication
      localStorage.setItem("userEmail", data.user.email)
      localStorage.setItem("isAuthenticated", "true")
      
      // The cookie is set by the server, but we can also verify it
      // Dispatch custom event to update navbar
      window.dispatchEvent(new Event("storage"))
      toast.success("Logged in successfully")
      
      // Small delay to ensure cookie is set
      setTimeout(() => {
        router.push("/dashboard")
      }, 100)
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Failed to log in - please try again")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <button
            onClick={() => router.push("/signup")}
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}

