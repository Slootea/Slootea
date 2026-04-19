"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { organizationSettingsApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { OrganizationSettings, ProviderSelectionMode } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Save, Users, Building2, Shield, AlertCircle, Clock, Calendar, Bell, Globe2, Bot, Banknote } from "lucide-react";
import { WhatsAppChannelSettings, SmsChannelSettings } from "@/components/notification-settings";

export default function OrganizationSettingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('organization');
  const { currentOrganization, isAdmin } = useOrganizationContext();
  useSetPageHeader(t('title'), t('description'));
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const res = await organizationSettingsApi.get();
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch organization settings", error);
      toast({
        title: t('messages.loadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchSettings();
    }
  }, [currentOrganization, getToken]);

  const handleSave = async () => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      await organizationSettingsApi.update({
        providerSelectionMode: settings.providerSelectionMode,
        showProviderNames: settings.showProviderNames,
        showProviderPhotos: settings.showProviderPhotos,
        minAdvanceBookingHours: settings.minAdvanceBookingHours,
        maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
        bufferTimeMinutes: settings.bufferTimeMinutes,
        maxAppointmentsPerDay: settings.maxAppointmentsPerDay,
        sendEmailReminders: settings.sendEmailReminders,
        sendSmsReminders: settings.sendSmsReminders,
        confirmationRequiredHours: settings.confirmationRequiredHours,
        confirmationDeadlineHours: settings.confirmationDeadlineHours,
        autoCancelUnconfirmed: settings.autoCancelUnconfirmed,
        autoConfirmAppointments: settings.autoConfirmAppointments,
        timezone: settings.timezone,
        aiAssistantEnabled: settings.aiAssistantEnabled,
        currency: settings.currency,
      });
      toast({ title: t('messages.saved') });
    } catch (error) {
      toast({
        title: t('messages.saveFailed'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Redirect or show message if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('adminOnly') || 'Admin Only'}</h2>
            <p className="text-muted-foreground">
              {t('adminOnlyDescription') || 'Only organization admins can access these settings.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('noOrganization')}</h2>
            <p className="text-muted-foreground">
              {t('selectOrganization')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <p className="text-muted-foreground">{t('messages.loadFailed')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Provider Selection Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('general.providerSelectionMode') || 'Provider Selection Mode'}
          </CardTitle>
          <CardDescription>
            {t('general.providerSelectionModeDescription') || 'Choose how providers are assigned to appointments'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={settings.providerSelectionMode}
            onValueChange={(value: ProviderSelectionMode) =>
              setSettings({ ...settings, providerSelectionMode: value })
            }
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="client_chooses" id="client_chooses" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="client_chooses" className="text-base font-medium cursor-pointer">
                  {t('general.clientChooses') || 'Client Chooses Provider'}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('general.clientChoosesHint') || 'Clients can select which team member they want for their appointment after choosing a service'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="auto_assign" id="auto_assign" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto_assign" className="text-base font-medium cursor-pointer">
                  {t('general.autoAssign') || 'Auto-Assign Based on Availability'}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('general.autoAssignHint') || 'The system automatically assigns the most available provider to each booking'}
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Additional options when client chooses */}
          {settings.providerSelectionMode === 'client_chooses' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showProviderNames">
                    {t('general.showProviderNames')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('general.showProviderNamesHint')}
                  </p>
                </div>
                <Switch
                  id="showProviderNames"
                  checked={settings.showProviderNames}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showProviderNames: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showProviderPhotos">
                    {t('general.showProviderPhotos')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('general.showProviderPhotosHint')}
                  </p>
                </div>
                <Switch
                  id="showProviderPhotos"
                  checked={settings.showProviderPhotos}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showProviderPhotos: checked })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t('confirmation.title') || 'Confirmation Settings'}
          </CardTitle>
          <CardDescription>
            {t('confirmation.description') || 'Control how and when appointment confirmations are required'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoConfirmAppointments">
                {t('confirmation.autoConfirm') || 'Auto-confirm appointments'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('confirmation.autoConfirmHint') || 'Automatically confirm appointments when they are booked'}
              </p>
            </div>
            <Switch
              id="autoConfirmAppointments"
              checked={settings.autoConfirmAppointments !== false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoConfirmAppointments: checked })
              }
            />
          </div>

          {/* Attendance reminder settings - always visible */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="confirmationRequiredHours">
              {t('confirmation.sendReminder') || 'Send attendance reminder (hours before)'}
            </Label>
            <NumberInput
              id="confirmationRequiredHours"
              min={1}
              max={168}
              value={settings.confirmationRequiredHours || 24}
              defaultValue={24}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  confirmationRequiredHours: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {settings.autoConfirmAppointments !== false 
                ? (t('confirmation.sendReminderHint') || 'For auto-confirmed appointments only. Send a reminder asking clients to confirm they will attend.')
                : (t('confirmation.sendReminderHintPending') || 'Send a reminder to pending appointments asking clients to confirm their booking.')
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationDeadlineHours">
              {t('confirmation.deadline') || 'Attendance confirmation deadline (hours before)'}
            </Label>
            <NumberInput
              id="confirmationDeadlineHours"
              min={1}
              max={72}
              value={settings.confirmationDeadlineHours || 3}
              defaultValue={3}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  confirmationDeadlineHours: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('confirmation.deadlineHint') || 'Client must confirm attendance by this deadline or the appointment may be cancelled'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoCancelUnconfirmed">
                {t('confirmation.autoCancel') || 'Auto-cancel unconfirmed appointments'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('confirmation.autoCancelHint') || 'Automatically cancel and free up slots if not confirmed by deadline'}
              </p>
            </div>
            <Switch
              id="autoCancelUnconfirmed"
              checked={settings.autoCancelUnconfirmed || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoCancelUnconfirmed: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('booking.title')}
          </CardTitle>
          <CardDescription>{t('booking.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="minAdvanceBookingHours">
              {t('booking.minAdvanceBooking')}
            </Label>
            <NumberInput
              id="minAdvanceBookingHours"
              min={0}
              max={168}
              value={settings.minAdvanceBookingHours}
              defaultValue={0}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  minAdvanceBookingHours: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('booking.minAdvanceBookingHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAdvanceBookingDays">
              {t('booking.maxAdvanceBooking')}
            </Label>
            <NumberInput
              id="maxAdvanceBookingDays"
              min={1}
              max={365}
              value={settings.maxAdvanceBookingDays}
              defaultValue={30}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  maxAdvanceBookingDays: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('booking.maxAdvanceBookingHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bufferTimeMinutes">
              {t('booking.bufferTime')}
            </Label>
            <NumberInput
              id="bufferTimeMinutes"
              min={0}
              max={120}
              value={settings.bufferTimeMinutes}
              defaultValue={0}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  bufferTimeMinutes: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('booking.bufferTimeHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAppointmentsPerDay">
              {t('booking.maxAppointmentsPerDay')}
            </Label>
            <NumberInput
              id="maxAppointmentsPerDay"
              min={0}
              max={100}
              value={settings.maxAppointmentsPerDay}
              defaultValue={0}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  maxAppointmentsPerDay: value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('booking.maxAppointmentsPerDayHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.title')}
          </CardTitle>
          <CardDescription>{t('notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp */}
          <WhatsAppChannelSettings />
          
          {/* SMS (Verimor) */}
          <SmsChannelSettings />
        </CardContent>
      </Card>

      {/* AI Assistant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('aiAssistant.title') || 'AI Service Assistant'}
          </CardTitle>
          <CardDescription>
            {t('aiAssistant.description') || 'Enable an AI-powered assistant to help clients find the right service when booking.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="aiAssistantEnabled">
                {t('aiAssistant.enable') || 'Enable AI Assistant'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('aiAssistant.enableHint') || 'When enabled, clients will first interact with an AI assistant that helps them find the right service based on their needs. They can also browse all services directly.'}
              </p>
            </div>
            <Switch
              id="aiAssistantEnabled"
              checked={settings.aiAssistantEnabled || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, aiAssistantEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            {t('timezone.title') || 'Timezone'}
          </CardTitle>
          <CardDescription>
            {t('timezone.description') || 'Set the timezone for your organization. All appointments and availability times will be based on this timezone.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">
              {t('timezone.label') || 'Organization Timezone'}
            </Label>
            <Select
              value={settings.timezone || 'UTC'}
              onValueChange={(value) =>
                setSettings({ ...settings, timezone: value })
              }
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem>
                <SelectItem value="Europe/Berlin">Europe/Berlin (CET/CEST)</SelectItem>
                <SelectItem value="Europe/Istanbul">Europe/Istanbul (TRT)</SelectItem>
                <SelectItem value="Europe/Moscow">Europe/Moscow (MSK)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                <SelectItem value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</SelectItem>
                <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                <SelectItem value="America/Denver">America/Denver (MST/MDT)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (BRT)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('timezone.hint') || 'This timezone will be used for calculating available appointment slots and displaying times.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {t('currency.title') || 'Currency'}
          </CardTitle>
          <CardDescription>
            {t('currency.description') || 'Set the currency for displaying service prices.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">
              {t('currency.label') || 'Organization Currency'}
            </Label>
            <Select
              value={settings.currency || 'TL'}
              onValueChange={(value) =>
                setSettings({ ...settings, currency: value })
              }
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder={t('currency.placeholder') || 'Select currency'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TL">₺ TL (Turkish Lira)</SelectItem>
                <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('currency.hint') || 'Currency used for displaying service prices.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('messages.saving') || 'Saving...' : t('messages.save') || 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
