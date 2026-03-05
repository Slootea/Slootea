"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  smsSettingsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  SmsNotificationSettings,
  SmsTemplate,
  SmsEventType,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import {
  Smartphone,
  Link,
  Unlink,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  FileText,
  Pencil,
  Copy,
  Info,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

interface ConnectFormData {
  username: string;
  password: string;
  sourceAddr: string;
}

interface SmsChannelSettingsProps {
  className?: string;
}

// Available template variables
const SMS_TEMPLATE_VARIABLES = [
  { variable: "{{clientName}}", descriptionKey: "clientName" },
  { variable: "{{serviceName}}", descriptionKey: "serviceName" },
  { variable: "{{appointmentDate}}", descriptionKey: "appointmentDate" },
  { variable: "{{appointmentTime}}", descriptionKey: "appointmentTime" },
  { variable: "{{providerName}}", descriptionKey: "providerName" },
  { variable: "{{organizationName}}", descriptionKey: "organizationName" },
  { variable: "{{confirmationLink}}", descriptionKey: "confirmationLink" },
  { variable: "{{appointmentLink}}", descriptionKey: "appointmentLink" },
];

// Event type labels
const EVENT_TYPE_KEYS: Record<SmsEventType, string> = {
  [SmsEventType.APPOINTMENT_CREATED]: "appointmentCreated",
  [SmsEventType.APPOINTMENT_REMINDER]: "appointmentReminder",
  [SmsEventType.APPOINTMENT_CANCELED]: "appointmentCanceled",
  [SmsEventType.APPOINTMENT_RESCHEDULED]: "appointmentRescheduled",
};

export function SmsChannelSettings({ className }: SmsChannelSettingsProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("organization");
  const { currentOrganization, isAdmin } = useOrganizationContext();

  const [settings, setSettings] = useState<SmsNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectingSms, setConnectingSms] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Form state for SMS connection
  const [connectForm, setConnectForm] = useState<ConnectFormData>({
    username: "",
    password: "",
    sourceAddr: "",
  });

  const fetchSettings = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const res = await smsSettingsApi.getSettings(currentOrganization.id);
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch SMS settings", error);
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
      const res = await smsSettingsApi.updateSettings(currentOrganization.id, {
        enabled,
      });
      setSettings(res.data);
      toast({ title: enabled ? t("notifications.sms.enabled") : t("notifications.sms.disabled") });
    } catch (error) {
      toast({
        title: t("notifications.sms.updateFailed"),
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
      const res = await smsSettingsApi.updateSettings(currentOrganization.id, {
        templateLanguage: language,
      });
      setSettings(res.data);
      toast({ title: t("notifications.sms.languageUpdated") });
    } catch (error) {
      toast({
        title: t("notifications.sms.updateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGlobalCredentials = async (useGlobal: boolean) => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      const res = await smsSettingsApi.updateSettings(currentOrganization.id, {
        useGlobalCredentials: useGlobal,
      });
      setSettings(res.data);
      toast({ title: t("notifications.sms.credentialsUpdated") });
    } catch (error) {
      toast({
        title: t("notifications.sms.updateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectSms = async () => {
    if (!currentOrganization) return;

    if (!connectForm.username || !connectForm.password || !connectForm.sourceAddr) {
      toast({
        title: t("notifications.sms.connectDialog.missingFields"),
        description: t("notifications.sms.connectDialog.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    setConnectingSms(true);
    try {
      const res = await smsSettingsApi.connect(currentOrganization.id, {
        username: connectForm.username,
        password: connectForm.password,
        sourceAddr: connectForm.sourceAddr,
      });
      setSettings(res.data);
      setConnectDialogOpen(false);
      setConnectForm({ username: "", password: "", sourceAddr: "" });
      toast({ title: t("notifications.sms.connectedSuccess") });
    } catch (error) {
      toast({
        title: t("notifications.sms.connectFailed"),
        description: t("notifications.sms.checkCredentials"),
        variant: "destructive",
      });
    } finally {
      setConnectingSms(false);
    }
  };

  const handleDisconnectSms = async () => {
    if (!currentOrganization) return;

    setConnectingSms(true);
    try {
      const res = await smsSettingsApi.disconnect(currentOrganization.id);
      setSettings(res.data);
      toast({ title: t("notifications.sms.disconnected") });
    } catch (error) {
      toast({
        title: t("notifications.sms.disconnectFailed"),
        variant: "destructive",
      });
    } finally {
      setConnectingSms(false);
    }
  };

  const handleEditTemplate = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setEditedContent(template.content);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !currentOrganization) return;

    setSavingTemplate(true);
    try {
      await smsSettingsApi.updateTemplate(currentOrganization.id, editingTemplate.id, {
        content: editedContent,
      });
      
      // Refresh templates
      const res = await smsSettingsApi.getSettings(currentOrganization.id);
      setSettings(res.data);
      
      setEditingTemplate(null);
      setEditedContent("");
      toast({ title: t("notifications.sms.templateSaved") });
    } catch (error) {
      toast({
        title: t("notifications.sms.templateSaveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = async (template: SmsTemplate) => {
    if (!currentOrganization) return;

    // Find default template for this event type and language
    const defaultTemplate = settings?.templates.find(
      t => t.isDefault && t.eventType === template.eventType && t.language === template.language
    );

    if (defaultTemplate) {
      setSavingTemplate(true);
      try {
        await smsSettingsApi.updateTemplate(currentOrganization.id, template.id, {
          content: defaultTemplate.content,
        });
        
        // Refresh templates
        const res = await smsSettingsApi.getSettings(currentOrganization.id);
        setSettings(res.data);
        
        toast({ title: t("notifications.sms.templateReset") });
      } catch (error) {
        toast({
          title: t("notifications.sms.templateResetFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingTemplate(false);
      }
    }
  };

  const insertVariable = (variable: string) => {
    setEditedContent(prev => prev + variable);
  };

  // Get templates for current language
  const getTemplatesForLanguage = (language: string) => {
    return settings?.templates?.filter(
      t => t.language === language && !t.isDefault && t.organizationId
    ) || [];
  };

  // Get active templates (either org-specific or defaults)
  const getActiveTemplates = () => {
    const language = settings?.templateLanguage || "tr";
    const orgTemplates = settings?.templates?.filter(
      t => t.language === language && !t.isDefault && t.organizationId
    ) || [];
    
    if (orgTemplates.length > 0) {
      return orgTemplates;
    }
    
    // Fall back to defaults
    return settings?.templates?.filter(
      t => t.language === language && t.isDefault
    ) || [];
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <Label>{t("notifications.sms.title")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("notifications.sms.loading")}</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const activeTemplates = getActiveTemplates();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <Label htmlFor="smsEnabled">
              {t("notifications.sms.title")}
            </Label>
            {settings.isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("notifications.sms.connected")}
              </Badge>
            ) : settings.useGlobalCredentials ? (
              <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("notifications.sms.usingGlobal")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                {t("notifications.sms.notConnected")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.isConnected && settings.sourceAddr
              ? t("notifications.sms.sendNotificationsVia", { sender: settings.sourceAddr })
              : t("notifications.sms.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.isConnected || settings.useGlobalCredentials ? (
            <>
              <Switch
                id="smsEnabled"
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
              {/* Templates Dialog */}
              <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("notifications.sms.editTemplates")}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("notifications.sms.templatesDialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("notifications.sms.templatesDialog.description")}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Template Variables Info */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{t("notifications.sms.templatesDialog.availableVariables")}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SMS_TEMPLATE_VARIABLES.map((v) => (
                          <code
                            key={v.variable}
                            className="text-xs bg-background px-2 py-1 rounded border cursor-pointer hover:bg-muted"
                            onClick={() => {
                              navigator.clipboard.writeText(v.variable);
                              toast({ title: t("notifications.sms.templatesDialog.copiedToClipboard") });
                            }}
                            title={t(`notifications.sms.variables.${v.descriptionKey}`)}
                          >
                            {v.variable}
                          </code>
                        ))}
                      </div>
                    </div>

                    {/* Templates Accordion */}
                    <Accordion type="single" collapsible className="w-full">
                      {activeTemplates.map((template) => (
                        <AccordionItem key={template.id} value={template.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {t(`notifications.sms.templates.${EVENT_TYPE_KEYS[template.eventType]}`)}
                              </span>
                              {template.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  {t("notifications.sms.active")}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {editingTemplate?.id === template.id ? (
                              <div className="space-y-4 pt-2">
                                <Textarea
                                  value={editedContent}
                                  onChange={(e) => setEditedContent(e.target.value)}
                                  rows={6}
                                  className="font-mono text-sm"
                                />
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {SMS_TEMPLATE_VARIABLES.map((v) => (
                                    <Button
                                      key={v.variable}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => insertVariable(v.variable)}
                                      className="text-xs h-7"
                                    >
                                      {v.variable}
                                    </Button>
                                  ))}
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTemplate(null);
                                      setEditedContent("");
                                    }}
                                  >
                                    {t("notifications.sms.cancel")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveTemplate}
                                    disabled={savingTemplate}
                                  >
                                    {savingTemplate ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {t("notifications.sms.save")}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-2">
                                <pre className="p-3 rounded bg-muted text-sm whitespace-pre-wrap font-mono">
                                  {template.content}
                                </pre>
                                <div className="flex justify-end gap-2">
                                  {!template.isDefault && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResetTemplate(template)}
                                      title={t("notifications.sms.resetToDefault")}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      {t("notifications.sms.reset")}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditTemplate(template)}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t("notifications.sms.edit")}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplatesDialogOpen(false)}>
                      {t("notifications.sms.close")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Disconnect Button - only show if using custom credentials */}
              {settings.isConnected && !settings.useGlobalCredentials && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDisconnectSms}
                  disabled={connectingSms}
                  title={t("notifications.sms.disconnect")}
                >
                  {connectingSms ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Connect Button */}
              <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <Link className="h-4 w-4 mr-2" />
                    {t("notifications.sms.connect")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("notifications.sms.connectDialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("notifications.sms.connectDialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t("notifications.sms.connectDialog.username")} *</Label>
                      <Input
                        id="username"
                        value={connectForm.username}
                        onChange={(e) => setConnectForm({ ...connectForm, username: e.target.value })}
                        placeholder={t("notifications.sms.connectDialog.usernamePlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t("notifications.sms.connectDialog.password")} *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={connectForm.password}
                        onChange={(e) => setConnectForm({ ...connectForm, password: e.target.value })}
                        placeholder={t("notifications.sms.connectDialog.passwordPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceAddr">{t("notifications.sms.connectDialog.sourceAddr")} *</Label>
                      <Input
                        id="sourceAddr"
                        value={connectForm.sourceAddr}
                        onChange={(e) => setConnectForm({ ...connectForm, sourceAddr: e.target.value })}
                        placeholder={t("notifications.sms.connectDialog.sourceAddrPlaceholder")}
                        maxLength={11}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("notifications.sms.connectDialog.sourceAddrHint")}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                      {t("notifications.sms.connectDialog.cancel")}
                    </Button>
                    <Button
                      onClick={handleConnectSms}
                      disabled={
                        connectingSms ||
                        !connectForm.username ||
                        !connectForm.password ||
                        !connectForm.sourceAddr
                      }
                    >
                      {connectingSms ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      {t("notifications.sms.connect")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Use Global Credentials Option */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleGlobalCredentials(true)}
                disabled={saving}
                title={t("notifications.sms.useGlobalCredentials")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Additional Settings - Only show when connected */}
      {(settings.isConnected || settings.useGlobalCredentials) && (
        <>
          {/* Language Selector */}
          <div className="flex items-center justify-between pl-6 py-2 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="smsTemplateLanguage">
                {t("notifications.sms.language.title")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("notifications.sms.language.description")}
              </p>
            </div>
            <Select
              value={settings.templateLanguage || "tr"}
              onValueChange={handleLanguageChange}
              disabled={saving}
            >
              <SelectTrigger id="smsTemplateLanguage" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">
                  {t("notifications.sms.language.turkish")}
                </SelectItem>
                <SelectItem value="en">
                  {t("notifications.sms.language.english")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Use Global vs Custom Credentials Toggle */}
          {settings.isConnected && (
            <div className="flex items-center justify-between pl-6 py-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="useGlobalCredentials">
                  {t("notifications.sms.useGlobalToggle.title")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("notifications.sms.useGlobalToggle.description")}
                </p>
              </div>
              <Switch
                id="useGlobalCredentials"
                checked={settings.useGlobalCredentials}
                onCheckedChange={handleToggleGlobalCredentials}
                disabled={saving}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
