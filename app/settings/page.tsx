"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/shell/AppShell"
import { DashboardSidebar } from "@/components/shell/DashboardSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save, Bell, Moon, Sun, Globe, Shield, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    projectNotifications: true,
    theme: "auto",
    language: "en",
    autoSave: true,
    showTips: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error("Failed to parse settings:", e)
      }
    }
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem("appSettings", JSON.stringify(settings))
      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    const defaultSettings = {
      emailNotifications: true,
      projectNotifications: true,
      theme: "auto",
      language: "en",
      autoSave: true,
      showTips: true,
    }
    setSettings(defaultSettings)
    localStorage.setItem("appSettings", JSON.stringify(defaultSettings))
    toast.success("Settings reset to defaults")
  }

  return (
    <AppShell showSidebar sidebarContent={<DashboardSidebar />}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-foreground mb-2">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your application preferences</p>
            </div>

            <div className="space-y-6">
              {/* Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive email updates about your projects</p>
                    </div>
                    <Button
                      variant={settings.emailNotifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                    >
                      {settings.emailNotifications ? "On" : "Off"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Project Notifications</p>
                      <p className="text-xs text-muted-foreground">Get notified about project updates</p>
                    </div>
                    <Button
                      variant={settings.projectNotifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, projectNotifications: !settings.projectNotifications })}
                    >
                      {settings.projectNotifications ? "On" : "Off"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Appearance</CardTitle>
                  </div>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <div className="flex gap-2">
                      {["light", "dark", "auto"].map((theme) => (
                        <Button
                          key={theme}
                          variant={settings.theme === theme ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSettings({ ...settings, theme })}
                          className="capitalize"
                        >
                          {theme === "auto" ? "System" : theme}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* General */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>General</CardTitle>
                  </div>
                  <CardDescription>General application settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto Save</p>
                      <p className="text-xs text-muted-foreground">Automatically save your work</p>
                    </div>
                    <Button
                      variant={settings.autoSave ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                    >
                      {settings.autoSave ? "On" : "Off"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Show Tips</p>
                      <p className="text-xs text-muted-foreground">Display helpful tips and hints</p>
                    </div>
                    <Button
                      variant={settings.showTips ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, showTips: !settings.showTips })}
                    >
                      {settings.showTips ? "On" : "Off"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy & Security */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Privacy & Security</CardTitle>
                  </div>
                  <CardDescription>Manage your privacy and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Data Collection</p>
                      <p className="text-xs text-muted-foreground">Help improve the app by sharing usage data</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  </div>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Reset Settings</p>
                      <p className="text-xs text-muted-foreground">Reset all settings to default values</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

