"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { User, Mail, Calendar, Save, Camera, Edit2 } from "lucide-react"
import { fetchWithAuth } from "@/lib/api-client"

interface UserProfile {
  id: string
  name: string | null
  email: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth("/api/user")
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setFormData({
          name: data.name || "",
          email: data.email || "",
        })
      } else {
        toast.error("Failed to load profile")
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetchWithAuth("/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setEditing(false)
        toast.success("Profile updated successfully")
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </AppShell>
    )
  }

  if (!profile) {
    return (
      <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-foreground mb-2">Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your personal information</p>
            </div>

            <div className="space-y-6">
              {/* Profile Picture */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile picture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center text-2xl font-semibold text-foreground">
                      {profile.name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Change Picture
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max size 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </div>
                    {!editing && (
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Name
                    </label>
                    {editing ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                      />
                    ) : (
                      <p className="text-sm text-foreground">{profile.name || "Not set"}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email
                    </label>
                    <p className="text-sm text-foreground">{profile.email}</p>
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  {editing && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(false)
                            setFormData({
                              name: profile.name || "",
                              email: profile.email || "",
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details and statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Member Since
                    </label>
                    <p className="text-sm text-foreground">{formatDate(profile.createdAt)}</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account ID</label>
                    <p className="text-sm text-muted-foreground font-mono text-xs">{profile.id}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

