"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { settingsApi, setAuthToken } from "@/lib/api";
import { BusinessSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import { locales, localeNames, localeFlags, Locale } from "@/i18n/config";
import { Save, Clock, Calendar, AlertCircle, Sun, Moon, Monitor, Globe } from "lucide-react";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const t = useTranslations('settings');
  const { locale: currentLocale, setLocale } = useLocale();
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
      toast({ title: t('savedSuccess') });
    } catch (error) {
      toast({
        title: t('saveError'),
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
        <p className="text-muted-foreground">{t('loadError')}</p>
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
            {t('appearance.title')}
          </CardTitle>
          <CardDescription>
            {t('appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('appearance.theme')}</Label>
            <p className="text-xs text-muted-foreground mb-3">
              {t('appearance.themeDescription')}
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
                  {t('appearance.light')}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t('appearance.dark')}
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  {t('appearance.system')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('language.title')}
          </CardTitle>
          <CardDescription>
            {t('language.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('language.label')}</Label>
            <p className="text-xs text-muted-foreground mb-3">
              {t('language.hint')}
            </p>
            {mounted && (
              <div className="flex gap-2">
                {locales.map((locale) => (
                  <Button
                    key={locale}
                    variant={currentLocale === locale ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocale(locale)}
                    className="flex items-center gap-2"
                  >
                    <span>{localeFlags[locale]}</span>
                    {localeNames[locale]}
                  </Button>
                ))}
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
            {t('confirmation.title')}
          </CardTitle>
          <CardDescription>
            {t('confirmation.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="confirmationRequiredHours">
              {t('confirmation.sendReminder')}
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
              {t('confirmation.sendReminderHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationDeadlineHours">
              {t('confirmation.deadline')}
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
              {t('confirmation.deadlineHint')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoCancelUnconfirmed">
                {t('confirmation.autoCancel')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('confirmation.autoCancelHint')}
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
            {t('scheduling.title')}
          </CardTitle>
          <CardDescription>
            {t('scheduling.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bufferTimeMinutes">
              {t('scheduling.bufferTime')}
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
              {t('scheduling.bufferTimeHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAppointmentsPerDay">
              {t('scheduling.maxPerDay')}
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
            {t('bookingWindow.title')}
          </CardTitle>
          <CardDescription>
            {t('bookingWindow.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="minAdvanceBookingHours">
              {t('bookingWindow.minAdvance')}
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
              {t('bookingWindow.minAdvanceHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAdvanceBookingDays">
              {t('bookingWindow.maxAdvance')}
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
              {t('bookingWindow.maxAdvanceHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('saving') : t('saveButton')}
        </Button>
      </div>
    </div>
  );
}
