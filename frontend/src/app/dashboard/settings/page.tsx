"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { settingsApi, setAuthToken } from "@/lib/api";
import { BusinessSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Save, Clock, Calendar, AlertCircle, Sun, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSettings = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const res = await settingsApi.get();
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [getToken]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await settingsApi.update({
        confirmationRequiredHours: settings.confirmationRequiredHours,
        confirmationDeadlineHours: settings.confirmationDeadlineHours,
        autoCancelUnconfirmed: settings.autoCancelUnconfirmed,
        bufferTimeMinutes: settings.bufferTimeMinutes,
        maxAppointmentsPerDay: settings.maxAppointmentsPerDay,
        minAdvanceBookingHours: settings.minAdvanceBookingHours,
        maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
      });
      toast({ title: "Settings saved successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the app looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select your preferred color scheme
            </p>
            {mounted && (
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  System
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Confirmation Settings
          </CardTitle>
          <CardDescription>
            Control how and when appointment confirmations are required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="confirmationRequiredHours">
              Send reminder (hours before appointment)
            </Label>
            <Input
              id="confirmationRequiredHours"
              type="number"
              min={1}
              max={168}
              value={settings.confirmationRequiredHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  confirmationRequiredHours: parseInt(e.target.value) || 24,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              How many hours before the appointment to send a confirmation request
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationDeadlineHours">
              Confirmation deadline (hours before appointment)
            </Label>
            <Input
              id="confirmationDeadlineHours"
              type="number"
              min={1}
              max={72}
              value={settings.confirmationDeadlineHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  confirmationDeadlineHours: parseInt(e.target.value) || 3,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Client must confirm by this deadline or the appointment may be cancelled
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoCancelUnconfirmed">
                Auto-cancel unconfirmed appointments
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically cancel and free up slots if not confirmed by deadline
              </p>
            </div>
            <Switch
              id="autoCancelUnconfirmed"
              checked={settings.autoCancelUnconfirmed}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoCancelUnconfirmed: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduling Settings
          </CardTitle>
          <CardDescription>
            Configure time buffers and limits for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bufferTimeMinutes">
              Buffer time between appointments (minutes)
            </Label>
            <Input
              id="bufferTimeMinutes"
              type="number"
              min={0}
              max={120}
              value={settings.bufferTimeMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bufferTimeMinutes: parseInt(e.target.value) || 15,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum gap between consecutive appointments
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAppointmentsPerDay">
              Maximum appointments per day
            </Label>
            <Input
              id="maxAppointmentsPerDay"
              type="number"
              min={1}
              max={100}
              value={settings.maxAppointmentsPerDay}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxAppointmentsPerDay: parseInt(e.target.value) || 10,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Window */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Window
          </CardTitle>
          <CardDescription>
            Set how far in advance clients can book
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="minAdvanceBookingHours">
              Minimum advance booking (hours)
            </Label>
            <Input
              id="minAdvanceBookingHours"
              type="number"
              min={0}
              max={168}
              value={settings.minAdvanceBookingHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minAdvanceBookingHours: parseInt(e.target.value) || 24,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Clients must book at least this many hours in advance
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAdvanceBookingDays">
              Maximum advance booking (days)
            </Label>
            <Input
              id="maxAdvanceBookingDays"
              type="number"
              min={1}
              max={365}
              value={settings.maxAdvanceBookingDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxAdvanceBookingDays: parseInt(e.target.value) || 30,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of days in the future clients can book
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
