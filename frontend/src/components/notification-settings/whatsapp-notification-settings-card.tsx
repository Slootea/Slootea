"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  notificationSettingsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  WhatsAppNotificationSettings,
  WhatsAppEventType,
  WhatsAppTemplateStatus,
  WhatsAppTemplate,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  Link,
  Unlink,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Event type labels for display
const EVENT_TYPE_LABELS: Record<WhatsAppEventType, string> = {
  [WhatsAppEventType.APPOINTMENT_CREATED]: "Appointment Created",
  [WhatsAppEventType.REMINDER_24H]: "24h Reminder",
  [WhatsAppEventType.REMINDER_1H]: "1h Reminder",
  [WhatsAppEventType.APPOINTMENT_CANCELED]: "Appointment Canceled",
};

// Template status badge colors
const STATUS_BADGE_VARIANTS: Record<WhatsAppTemplateStatus, "default" | "secondary" | "destructive" | "outline"> = {
  [WhatsAppTemplateStatus.PENDING]: "secondary",
  [WhatsAppTemplateStatus.APPROVED]: "default",
  [WhatsAppTemplateStatus.REJECTED]: "destructive",
};

// Language options for templates
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese" },
];

interface TemplateFormData {
  eventType: WhatsAppEventType | "";
  templateName: string;
  languageCode: string;
}

interface ConnectFormData {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  displayPhoneNumber: string;
}

export function WhatsAppNotificationSettingsCard() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("organization");
  const { currentOrganization, isAdmin } = useOrganizationContext();

  const [settings, setSettings] = useState<WhatsAppNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  // Form state for template assignment
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    eventType: "",
    templateName: "",
    languageCode: "en",
  });

  // Form state for WhatsApp connection
  const [connectForm, setConnectForm] = useState<ConnectFormData>({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    displayPhoneNumber: "",
  });

  const fetchSettings = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const res = await notificationSettingsApi.getWhatsAppSettings(currentOrganization.id);
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch WhatsApp settings", error);
      toast({
        title: "Failed to load WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getToken, toast]);

  useEffect(() => {
    if (currentOrganization) {
      fetchSettings();
    }
  }, [currentOrganization, fetchSettings]);

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      const res = await notificationSettingsApi.updateWhatsAppSettings(currentOrganization.id, {
        enabled,
        parameters: settings.parameters,
      });
      setSettings(res.data);
      toast({ title: enabled ? "WhatsApp notifications enabled" : "WhatsApp notifications disabled" });
    } catch (error) {
      toast({
        title: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleParameterChange = async (param: keyof WhatsAppNotificationSettings['parameters'], value: boolean) => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      const res = await notificationSettingsApi.updateWhatsAppSettings(currentOrganization.id, {
        enabled: settings.enabled,
        parameters: {
          ...settings.parameters,
          [param]: value,
        },
      });
      setSettings(res.data);
    } catch (error) {
      toast({
        title: "Failed to update parameters",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle WhatsApp Business connection with provided credentials
   */
  const handleConnectWhatsApp = async () => {
    if (!currentOrganization) return;

    // Validate form
    if (!connectForm.wabaId || !connectForm.phoneNumberId || !connectForm.accessToken) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setConnectingWhatsApp(true);
    try {
      const res = await notificationSettingsApi.connectWhatsApp(currentOrganization.id, {
        wabaId: connectForm.wabaId,
        phoneNumberId: connectForm.phoneNumberId,
        accessToken: connectForm.accessToken,
        displayPhoneNumber: connectForm.displayPhoneNumber || undefined,
      });
      setSettings(res.data);
      setConnectDialogOpen(false);
      setConnectForm({ wabaId: "", phoneNumberId: "", accessToken: "", displayPhoneNumber: "" });
      toast({ title: "WhatsApp Business connected successfully" });
    } catch (error) {
      toast({
        title: "Failed to connect WhatsApp",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!currentOrganization) return;

    setConnectingWhatsApp(true);
    try {
      const res = await notificationSettingsApi.disconnectWhatsApp(currentOrganization.id);
      setSettings(res.data);
      toast({ title: "WhatsApp Business disconnected" });
    } catch (error) {
      toast({
        title: "Failed to disconnect WhatsApp",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!currentOrganization || !templateForm.eventType || !templateForm.templateName) return;

    setAssigningTemplate(true);
    try {
      await notificationSettingsApi.assignTemplate(currentOrganization.id, {
        eventType: templateForm.eventType,
        templateName: templateForm.templateName,
        languageCode: templateForm.languageCode,
      });
      
      // Refresh settings to get updated templates
      await fetchSettings();
      
      setTemplateDialogOpen(false);
      setTemplateForm({ eventType: "", templateName: "", languageCode: "en" });
      toast({ title: "Template assigned successfully" });
    } catch (error) {
      toast({
        title: "Failed to assign template",
        variant: "destructive",
      });
    } finally {
      setAssigningTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!currentOrganization) return;

    try {
      await notificationSettingsApi.deleteTemplate(currentOrganization.id, templateId);
      await fetchSettings();
      toast({ title: "Template removed" });
    } catch (error) {
      toast({
        title: "Failed to remove template",
        variant: "destructive",
      });
    }
  };

  // Get available event types (ones that don't have a template assigned)
  const getAvailableEventTypes = () => {
    if (!settings) return Object.values(WhatsAppEventType);
    const assignedTypes = settings.templates.map((t) => t.eventType);
    return Object.values(WhatsAppEventType).filter((type) => !assignedTypes.includes(type));
  };

  // Get template for a specific event type
  const getTemplateForEvent = (eventType: WhatsAppEventType): WhatsAppTemplate | undefined => {
    return settings?.templates.find((t) => t.eventType === eventType);
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Failed to load WhatsApp settings</p>
        </CardContent>
      </Card>
    );
  }

  const isDisabled = !settings.isConnected || !settings.enabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <CardTitle>{t("notifications.whatsapp.title") || "WhatsApp Notifications"}</CardTitle>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={saving || !settings.isConnected}
          />
        </div>
        <CardDescription>
          {t("notifications.whatsapp.description") || "Configure WhatsApp Business API notifications for your appointments"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status Block */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${settings.isConnected ? "bg-green-100" : "bg-gray-100"}`}>
                <Phone className={`h-5 w-5 ${settings.isConnected ? "text-green-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="font-medium">
                  {settings.isConnected ? "WhatsApp Business Connected" : "WhatsApp Business Not Connected"}
                </p>
                {settings.isConnected && settings.displayPhoneNumber && (
                  <p className="text-sm text-muted-foreground">
                    Phone: {settings.displayPhoneNumber}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={settings.isConnected ? "default" : "secondary"}>
              {settings.isConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>

          <div className="flex gap-2">
            {settings.isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectWhatsApp}
                disabled={connectingWhatsApp}
              >
                {connectingWhatsApp ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            ) : (
              <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Link className="h-4 w-4 mr-2" />
                    Connect WhatsApp Business
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Connect WhatsApp Business</DialogTitle>
                    <DialogDescription>
                      Enter your WhatsApp Business API credentials from Meta Business Manager.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>You can find these values in your <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Business Settings</a> under WhatsApp Accounts.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wabaId">WhatsApp Business Account ID *</Label>
                      <Input
                        id="wabaId"
                        value={connectForm.wabaId}
                        onChange={(e) => setConnectForm({ ...connectForm, wabaId: e.target.value })}
                        placeholder="e.g., 123456789012345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                      <Input
                        id="phoneNumberId"
                        value={connectForm.phoneNumberId}
                        onChange={(e) => setConnectForm({ ...connectForm, phoneNumberId: e.target.value })}
                        placeholder="e.g., 123456789012345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accessToken">Permanent Access Token *</Label>
                      <Input
                        id="accessToken"
                        type="password"
                        value={connectForm.accessToken}
                        onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                        placeholder="Your permanent access token"
                      />
                      <p className="text-xs text-muted-foreground">
                        Generate a permanent token in Meta Business Settings → System Users
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayPhoneNumber">Display Phone Number</Label>
                      <Input
                        id="displayPhoneNumber"
                        value={connectForm.displayPhoneNumber}
                        onChange={(e) => setConnectForm({ ...connectForm, displayPhoneNumber: e.target.value })}
                        placeholder="e.g., +1 555 123 4567"
                      />
                      <p className="text-xs text-muted-foreground">
                        The phone number to display in the dashboard (optional)
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConnectWhatsApp} 
                      disabled={connectingWhatsApp || !connectForm.wabaId || !connectForm.phoneNumberId || !connectForm.accessToken}
                    >
                      {connectingWhatsApp ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      Connect
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Notification Parameters */}
        <div className={`space-y-4 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <h4 className="font-medium mb-3">Notification Events</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which events should trigger WhatsApp notifications
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="appointmentCreated">Appointment Created</Label>
                <p className="text-xs text-muted-foreground">
                  Send notification when a new appointment is booked
                </p>
              </div>
              <Checkbox
                id="appointmentCreated"
                checked={settings.parameters.appointmentCreated}
                onCheckedChange={(checked) => handleParameterChange("appointmentCreated", !!checked)}
                disabled={isDisabled || saving}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="reminder24h">24 Hour Reminder</Label>
                <p className="text-xs text-muted-foreground">
                  Send reminder 24 hours before the appointment
                </p>
              </div>
              <Checkbox
                id="reminder24h"
                checked={settings.parameters.reminder24h}
                onCheckedChange={(checked) => handleParameterChange("reminder24h", !!checked)}
                disabled={isDisabled || saving}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="reminder1h">1 Hour Reminder</Label>
                <p className="text-xs text-muted-foreground">
                  Send reminder 1 hour before the appointment
                </p>
              </div>
              <Checkbox
                id="reminder1h"
                checked={settings.parameters.reminder1h}
                onCheckedChange={(checked) => handleParameterChange("reminder1h", !!checked)}
                disabled={isDisabled || saving}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="appointmentCanceled">Appointment Canceled</Label>
                <p className="text-xs text-muted-foreground">
                  Send notification when an appointment is canceled
                </p>
              </div>
              <Checkbox
                id="appointmentCanceled"
                checked={settings.parameters.appointmentCanceled}
                onCheckedChange={(checked) => handleParameterChange("appointmentCanceled", !!checked)}
                disabled={isDisabled || saving}
              />
            </div>
          </div>
        </div>

        {/* Message Template Mapping */}
        <div className={`space-y-4 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Message Templates</h4>
              <p className="text-sm text-muted-foreground">
                Map WhatsApp message templates to notification events
              </p>
            </div>
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={isDisabled || getAvailableEventTypes().length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Message Template</DialogTitle>
                  <DialogDescription>
                    Map a WhatsApp message template to a notification event. 
                    Templates must be pre-approved in your Meta Business account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select
                      value={templateForm.eventType}
                      onValueChange={(value) => setTemplateForm({ ...templateForm, eventType: value as WhatsAppEventType })}
                    >
                      <SelectTrigger id="eventType">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableEventTypes().map((type) => (
                          <SelectItem key={type} value={type}>
                            {EVENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateForm.templateName}
                      onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                      placeholder="e.g., appointment_reminder_24h"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the exact template name as configured in Meta Business
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languageCode">Language</Label>
                    <Select
                      value={templateForm.languageCode}
                      onValueChange={(value) => setTemplateForm({ ...templateForm, languageCode: value })}
                    >
                      <SelectTrigger id="languageCode">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignTemplate}
                    disabled={!templateForm.eventType || !templateForm.templateName || assigningTemplate}
                  >
                    {assigningTemplate ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Template list */}
          <div className="space-y-2">
            {settings.templates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No message templates configured</p>
                <p className="text-sm">Add templates to customize your notification messages</p>
              </div>
            ) : (
              settings.templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{EVENT_TYPE_LABELS[template.eventType]}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.templateName} ({template.languageCode})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANTS[template.status]}>
                      {template.status === WhatsAppTemplateStatus.PENDING && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {template.status === WhatsAppTemplateStatus.APPROVED && (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      {template.status === WhatsAppTemplateStatus.REJECTED && (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {template.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={isDisabled}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info about message sending */}
        {!settings.isConnected && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Get Started</p>
              <p className="mt-1">
                Connect your WhatsApp Business Account to start sending automated notifications 
                to your clients when appointments are booked, confirmed, or cancelled.
              </p>
            </div>
          </div>
        )}
        
        {settings.isConnected && settings.enabled && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 text-green-800">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">WhatsApp Notifications Active</p>
              <p className="mt-1">
                Your clients will receive WhatsApp notifications for the events you have enabled above.
                Make sure you have approved message templates configured for each event type.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
