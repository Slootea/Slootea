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
import { WhatsAppOAuthDialog } from "./whatsapp-oauth-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  Link,
  Unlink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Info,
  Copy,
  FileText,
  ExternalLink,
} from "lucide-react";

interface ConnectFormData {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  displayPhoneNumber: string;
}

interface WhatsAppChannelSettingsProps {
  className?: string;
}

export function WhatsAppChannelSettings({ className }: WhatsAppChannelSettingsProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("organization");
  const { currentOrganization, isAdmin } = useOrganizationContext();

  const [settings, setSettings] = useState<WhatsAppNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [templatesInfoOpen, setTemplatesInfoOpen] = useState(false);

  // Required Meta WhatsApp templates
  const requiredTemplates = [
    { name: "appointment_created", descriptionKey: "appointmentCreated" },
    { name: "appointment_reminder", descriptionKey: "appointmentReminder" },
    { name: "appointment_canceled", descriptionKey: "appointmentCanceled" },
    { name: "appointment_rescheduled", descriptionKey: "appointmentRescheduled" },
  ];

  // Available template variables (order matters - Meta uses {{1}}, {{2}}, etc.)
  const templateVariables = [
    { order: 1, variable: "{{clientName}}", descriptionKey: "clientName" },
    { order: 2, variable: "{{serviceName}}", descriptionKey: "serviceName" },
    { order: 3, variable: "{{appointmentDate}}", descriptionKey: "appointmentDate" },
    { order: 4, variable: "{{appointmentTime}}", descriptionKey: "appointmentTime" },
    { order: 5, variable: "{{providerName}}", descriptionKey: "providerName" },
    { order: 6, variable: "{{organizationName}}", descriptionKey: "organizationName" },
    { order: 7, variable: "{{appointmentLink}}", descriptionKey: "appointmentLink" },
    { order: 8, variable: "{{confirmationLink}}", descriptionKey: "confirmationLink" },
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
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getToken]);

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
        templateLanguage: settings.templateLanguage,
      });
      setSettings(res.data);
      toast({ title: enabled ? t("notifications.whatsapp.enabled") : t("notifications.whatsapp.disabled") });
    } catch (error) {
      toast({
        title: t("notifications.whatsapp.updateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      const res = await notificationSettingsApi.updateWhatsAppSettings(currentOrganization.id, {
        enabled: settings.enabled,
        parameters: settings.parameters,
        templateLanguage: language,
      });
      setSettings(res.data);
      toast({ title: t("notifications.whatsapp.languageUpdated") });
    } catch (error) {
      toast({
        title: t("notifications.whatsapp.updateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!currentOrganization) return;

    if (!connectForm.wabaId || !connectForm.phoneNumberId || !connectForm.accessToken) {
      toast({
        title: t("notifications.whatsapp.connectDialog.missingFields"),
        description: t("notifications.whatsapp.connectDialog.fillAllFields"),
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
      toast({ title: t("notifications.whatsapp.connectedSuccess") });
    } catch (error) {
      toast({
        title: t("notifications.whatsapp.connectFailed"),
        description: t("notifications.whatsapp.checkCredentials"),
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
      toast({ title: t("notifications.whatsapp.disconnected") });
    } catch (error) {
      toast({
        title: t("notifications.whatsapp.disconnectFailed"),
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
      <div className={`flex items-center justify-between ${className}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <Label>{t("notifications.whatsapp.title")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("notifications.whatsapp.loading")}</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <Label htmlFor="whatsappEnabled">
              {t("notifications.whatsapp.title")}
            </Label>
            {settings.isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("notifications.whatsapp.connected")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                {t("notifications.whatsapp.notConnected")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.isConnected && settings.displayPhoneNumber
              ? t("notifications.whatsapp.sendNotificationsVia", { phone: settings.displayPhoneNumber })
              : t("notifications.whatsapp.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.isConnected ? (
            <>
              <Switch
                id="whatsappEnabled"
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
              {/* Templates Info Dialog */}
              <Dialog open={templatesInfoOpen} onOpenChange={setTemplatesInfoOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("notifications.whatsapp.viewTemplates")}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("notifications.whatsapp.templatesSetup.title")}</DialogTitle>
                    <DialogDescription>
                      {t("notifications.whatsapp.templatesSetup.description")}{" "}
                      <a
                        href="https://business.facebook.com/wa/manage/message-templates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary"
                      >
                        Meta Business Manager
                      </a>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Required Templates */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">{t("notifications.whatsapp.templatesSetup.requiredTemplates")}</h4>
                      <div className="space-y-2">
                        {requiredTemplates.map((template) => (
                          <div
                            key={template.name}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div>
                              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                                {template.name}
                              </code>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(`notifications.whatsapp.templates.${template.descriptionKey}`)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(template.name);
                                toast({ title: t("notifications.whatsapp.templatesSetup.copiedToClipboard") });
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
                      <h4 className="font-semibold text-sm mb-3">{t("notifications.whatsapp.templatesSetup.availableVariables")}</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        {t("notifications.whatsapp.templatesSetup.variablesDescription")}
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">{t("notifications.whatsapp.templatesSetup.orderColumn")}</th>
                              <th className="px-3 py-2 text-left font-medium">{t("notifications.whatsapp.templatesSetup.variableColumn")}</th>
                              <th className="px-3 py-2 text-left font-medium">{t("notifications.whatsapp.templatesSetup.descriptionColumn")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {templateVariables.map((v, index) => (
                              <tr
                                key={v.variable}
                                className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                              >
                                <td className="px-3 py-2 text-muted-foreground">{v.order}</td>
                                <td className="px-3 py-2">
                                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {v.variable}
                                  </code>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{t(`notifications.whatsapp.variables.${v.descriptionKey}`)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Example Templates */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">{t("notifications.whatsapp.templatesSetup.exampleTemplates")}</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        {t("notifications.whatsapp.templatesSetup.exampleDescription")}
                      </p>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_created</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Merhaba {{clientName}}! {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için onaylandı.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\nOnay: {{confirmationLink}}\n\nGörüşmek üzere!`);
                                toast({ title: t("notifications.whatsapp.templatesSetup.copiedToClipboard") });
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

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_reminder</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Hatırlatma: Merhaba {{clientName}}! {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\n\nSizi bekliyoruz!`);
                                toast({ title: t("notifications.whatsapp.templatesSetup.copiedToClipboard") });
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

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_canceled</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Randevu İptali: Merhaba {{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için planlanmış {{serviceName}} randevunuz iptal edilmiştir.\n\nİşletme: {{organizationName}}\n\nYeni randevu için: {{appointmentLink}}\n\nAnlayışınız için teşekkür ederiz.`);
                                toast({ title: t("notifications.whatsapp.templatesSetup.copiedToClipboard") });
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

                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">appointment_rescheduled</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`Randevu Güncellendi: Merhaba {{clientName}}! {{serviceName}} randevunuz yeni tarihe alınmıştır: {{appointmentDate}}, saat {{appointmentTime}}.\n\nHizmet Sağlayıcı: {{providerName}}\nİşletme: {{organizationName}}\n\nDetaylar: {{appointmentLink}}\nOnay: {{confirmationLink}}\n\nGörüşmek üzere!`);
                                toast({ title: t("notifications.whatsapp.templatesSetup.copiedToClipboard") });
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
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">{t("notifications.whatsapp.templatesSetup.importantNotes")}</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li>{t("notifications.whatsapp.templatesSetup.noteMatchExactly")}</li>
                          <li>{t("notifications.whatsapp.templatesSetup.noteApproval")}</li>
                          <li>{t("notifications.whatsapp.templatesSetup.noteParameters")}</li>
                          <li>{t("notifications.whatsapp.templatesSetup.noteLanguage")}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplatesInfoOpen(false)}>
                      {t("notifications.whatsapp.templatesSetup.close")}
                    </Button>
                    <Button asChild>
                      <a
                        href="https://business.facebook.com/wa/manage/message-templates"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("notifications.whatsapp.templatesSetup.openMetaManager")}
                      </a>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnectWhatsApp}
                disabled={connectingWhatsApp}
                title={t("notifications.whatsapp.disconnect")}
              >
                {connectingWhatsApp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Primary: OAuth Popup Flow */}
              <Button size="sm" variant="default" onClick={() => setOauthDialogOpen(true)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("notifications.whatsapp.connectWithMeta") || "Connect with Meta"}
              </Button>
              
              {/* OAuth Dialog */}
              <WhatsAppOAuthDialog
                organizationId={currentOrganization?.id}
                open={oauthDialogOpen}
                onOpenChange={setOauthDialogOpen}
                onSuccess={(newSettings) => {
                  setSettings(newSettings);
                  toast({ title: t("notifications.whatsapp.connectedSuccess") });
                }}
              />

              {/* Secondary: Manual Entry Dialog */}
              <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" title={t("notifications.whatsapp.manualConnect") || "Manual Setup"}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("notifications.whatsapp.connectDialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("notifications.whatsapp.connectDialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>
                          {t("notifications.whatsapp.connectDialog.findValues")}{" "}
                          <a
                            href="https://business.facebook.com/settings/whatsapp-business-accounts"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Meta Business Settings
                          </a>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wabaId">{t("notifications.whatsapp.connectDialog.wabaId")} *</Label>
                      <Input
                        id="wabaId"
                        value={connectForm.wabaId}
                        onChange={(e) => setConnectForm({ ...connectForm, wabaId: e.target.value })}
                        placeholder={t("notifications.whatsapp.connectDialog.wabaIdPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumberId">{t("notifications.whatsapp.connectDialog.phoneNumberId")} *</Label>
                      <Input
                        id="phoneNumberId"
                        value={connectForm.phoneNumberId}
                        onChange={(e) => setConnectForm({ ...connectForm, phoneNumberId: e.target.value })}
                        placeholder={t("notifications.whatsapp.connectDialog.phoneNumberIdPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accessToken">{t("notifications.whatsapp.connectDialog.accessToken")} *</Label>
                      <Input
                        id="accessToken"
                        type="password"
                        value={connectForm.accessToken}
                        onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                        placeholder={t("notifications.whatsapp.connectDialog.accessTokenPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("notifications.whatsapp.connectDialog.accessTokenHint")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayPhoneNumber">{t("notifications.whatsapp.connectDialog.displayPhoneNumber")}</Label>
                      <Input
                        id="displayPhoneNumber"
                        value={connectForm.displayPhoneNumber}
                        onChange={(e) => setConnectForm({ ...connectForm, displayPhoneNumber: e.target.value })}
                        placeholder={t("notifications.whatsapp.connectDialog.displayPhoneNumberPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("notifications.whatsapp.connectDialog.displayPhoneNumberHint")}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                      {t("notifications.whatsapp.connectDialog.cancel")}
                    </Button>
                    <Button
                      onClick={handleConnectWhatsApp}
                      disabled={
                        connectingWhatsApp ||
                        !connectForm.wabaId ||
                        !connectForm.phoneNumberId ||
                        !connectForm.accessToken
                      }
                    >
                      {connectingWhatsApp ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      {t("notifications.whatsapp.connect")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Language Selector - Only show when connected */}
      {settings.isConnected && (
        <div className="flex items-center justify-between pl-6 py-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="templateLanguage">
              {t("notifications.whatsapp.language.title")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("notifications.whatsapp.language.description")}
            </p>
          </div>
          <Select
            value={settings.templateLanguage || "tr"}
            onValueChange={handleLanguageChange}
            disabled={saving}
          >
            <SelectTrigger id="templateLanguage" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">
                {t("notifications.whatsapp.language.turkish")}
              </SelectItem>
              <SelectItem value="en_US">
                {t("notifications.whatsapp.language.englishUS")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
