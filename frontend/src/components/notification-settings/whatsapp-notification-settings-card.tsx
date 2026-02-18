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
  AlertCircle,
  Loader2,
  Info,
  Copy,
  FileText,
} from "lucide-react";

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
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [templatesInfoOpen, setTemplatesInfoOpen] = useState(false);

  // Required Meta WhatsApp templates
  const requiredTemplates = [
    { name: "appointment_created", description: "Sent when a new appointment is booked" },
    { name: "appointment_reminder", description: "Sent before appointment as reminder" },
    { name: "appointment_canceled", description: "Sent when appointment is canceled" },
    { name: "appointment_rescheduled", description: "Sent when appointment is rescheduled" },
  ];

  // Available template variables (order matters - Meta uses {{1}}, {{2}}, etc.)
  const templateVariables = [
    { order: 1, variable: "{{clientName}}", description: "Client's name" },
    { order: 2, variable: "{{serviceName}}", description: "Service/appointment type" },
    { order: 3, variable: "{{appointmentDate}}", description: "Date (e.g., 15 Şubat 2026)" },
    { order: 4, variable: "{{appointmentTime}}", description: "Time (e.g., 14:30)" },
    { order: 5, variable: "{{providerName}}", description: "Provider/staff name" },
    { order: 6, variable: "{{organizationName}}", description: "Business name" },
    { order: 7, variable: "{{appointmentLink}}", description: "Link to view appointment" },
    { order: 8, variable: "{{confirmationLink}}", description: "Link to confirm appointment" },
  ];

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
                <Label htmlFor="appointmentReminder">Appointment Reminder</Label>
                <p className="text-xs text-muted-foreground">
                  Send reminder before the appointment
                </p>
              </div>
              <Checkbox
                id="appointmentReminder"
                checked={settings.parameters.appointmentReminder}
                onCheckedChange={(checked) => handleParameterChange("appointmentReminder", !!checked)}
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
                Message content is configured in the Message Templates section below.
              </p>
            </div>
          </div>
        )}

        {/* Meta Templates Info Dialog Trigger */}
        {settings.isConnected && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">WhatsApp Message Templates Required</p>
              <p className="text-sm text-amber-700 mt-1">
                WhatsApp Business API requires pre-approved message templates from Meta. 
                You need to create templates in your Meta Business Manager.
              </p>
              <Dialog open={templatesInfoOpen} onOpenChange={setTemplatesInfoOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Info className="h-4 w-4 mr-2" />
                    View Required Templates & Variables
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>WhatsApp Message Templates Setup</DialogTitle>
                    <DialogDescription>
                      Create these templates in your <a href="https://business.facebook.com/wa/manage/message-templates" target="_blank" rel="noopener noreferrer" className="underline text-primary">Meta Business Manager</a> with exactly 8 body parameters.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Required Templates */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Required Template Names</h4>
                      <div className="space-y-2">
                        {requiredTemplates.map((template) => (
                          <div key={template.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <code className="text-sm font-mono bg-background px-2 py-1 rounded">{template.name}</code>
                              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(template.name);
                                toast({ title: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Template Variables */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Available Variables (8 Parameters)</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        These variables are sent in order. In Meta templates, use {`{{1}}`}, {`{{2}}`}, etc.
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">#</th>
                              <th className="px-3 py-2 text-left font-medium">Variable</th>
                              <th className="px-3 py-2 text-left font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {templateVariables.map((v, index) => (
                              <tr key={v.variable} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                                <td className="px-3 py-2 text-muted-foreground">{v.order}</td>
                                <td className="px-3 py-2">
                                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{v.variable}</code>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{v.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Example Templates */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Example Template Bodies</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Copy these templates to Meta Business Manager. Each template must not start or end with a variable.
                      </p>
                      <div className="space-y-4">
                        {/* appointment_created */}
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_created</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Merhaba {{clientName}}! {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için onaylandı.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\nOnay: {{confirmationLink}}\n\nGörüşmek üzere!`);
                                toast({ title: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="p-3 rounded bg-muted text-xs whitespace-pre-wrap">{`Merhaba {{clientName}}! {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için onaylandı.

Hizmet Sağlayıcı: {{providerName}}
İşletme: {{organizationName}}

Detaylar: {{appointmentLink}}
Onay: {{confirmationLink}}

Görüşmek üzere!`}</pre>
                        </div>

                        {/* appointment_reminder */}
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_reminder</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Hatırlatma: Merhaba {{clientName}}! {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\n\nSizi bekliyoruz!`);
                                toast({ title: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="p-3 rounded bg-muted text-xs whitespace-pre-wrap">{`Hatırlatma: Merhaba {{clientName}}! {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır.

Hizmet Sağlayıcı: {{providerName}}
İşletme: {{organizationName}}

Detaylar: {{appointmentLink}}

Sizi bekliyoruz!`}</pre>
                        </div>

                        {/* appointment_canceled */}
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_canceled</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Randevu İptali: Merhaba {{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için planlanmış {{serviceName}} randevunuz iptal edilmiştir.\n\nİşletme: {{organizationName}}\n\nYeni randevu için: {{appointmentLink}}\n\nAnlayışınız için teşekkür ederiz.`);
                                toast({ title: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="p-3 rounded bg-muted text-xs whitespace-pre-wrap">{`Randevu İptali: Merhaba {{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için planlanmış {{serviceName}} randevunuz iptal edilmiştir.

İşletme: {{organizationName}}

Yeni randevu için: {{appointmentLink}}

Anlayışınız için teşekkür ederiz.`}</pre>
                        </div>

                        {/* appointment_rescheduled */}
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_rescheduled</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Randevu Güncellendi: Merhaba {{clientName}}! {{serviceName}} randevunuz yeni tarihe alınmıştır: {{appointmentDate}}, saat {{appointmentTime}}.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\nOnay: {{confirmationLink}}\n\nGörüşmek üzere!`);
                                toast({ title: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="p-3 rounded bg-muted text-xs whitespace-pre-wrap">{`Randevu Güncellendi: Merhaba {{clientName}}! {{serviceName}} randevunuz yeni tarihe alınmıştır: {{appointmentDate}}, saat {{appointmentTime}}.

Hizmet Sağlayıcı: {{providerName}}
İşletme: {{organizationName}}

Detaylar: {{appointmentLink}}
Onay: {{confirmationLink}}

Görüşmek üzere!`}</pre>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Important Notes</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li>Template names must match exactly as shown above</li>
                          <li>Templates must be approved by Meta before use</li>
                          <li>All 8 parameters will be sent in order, use only what you need</li>
                          <li>Set template language to match your organization&apos;s language setting</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplatesInfoOpen(false)}>
                      Close
                    </Button>
                    <Button asChild>
                      <a href="https://business.facebook.com/wa/manage/message-templates" target="_blank" rel="noopener noreferrer">
                        Open Meta Business Manager
                      </a>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
