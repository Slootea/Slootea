"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations, useLocale } from "next-intl";
import { messageTemplatesApi, notificationSettingsApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { 
  MessageTemplate, 
  MessageTemplateType, 
  AllMessageTemplatesResponse,
  WhatsAppBusinessTemplate,
  WhatsAppBusinessTemplatesListResponse,
  WhatsAppEventType,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Bell,
  XCircle,
  Calendar,
  RefreshCw,
  Loader2,
  Cloud,
  CloudOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Link2,
} from "lucide-react";

const TEMPLATE_TYPE_INFO: Record<MessageTemplateType, { icon: React.ElementType; color: string }> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: { icon: Calendar, color: "text-green-500" },
  [MessageTemplateType.APPOINTMENT_REMINDER]: { icon: Bell, color: "text-blue-500" },
  [MessageTemplateType.APPOINTMENT_UPDATED]: { icon: RefreshCw, color: "text-orange-500" },
  [MessageTemplateType.APPOINTMENT_CANCELED]: { icon: XCircle, color: "text-red-500" },
};

// Map message template types to WhatsApp event types
const TEMPLATE_TO_WHATSAPP_EVENT: Record<MessageTemplateType, WhatsAppEventType[]> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: [WhatsAppEventType.APPOINTMENT_CREATED],
  [MessageTemplateType.APPOINTMENT_REMINDER]: [WhatsAppEventType.APPOINTMENT_REMINDER],
  [MessageTemplateType.APPOINTMENT_UPDATED]: [WhatsAppEventType.APPOINTMENT_RESCHEDULED],
  [MessageTemplateType.APPOINTMENT_CANCELED]: [WhatsAppEventType.APPOINTMENT_CANCELED],
};

// WhatsApp languages
const WHATSAPP_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'tr', label: 'Turkish' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'ar', label: 'Arabic' },
];

// Placeholder keys for translation lookup (strip {{ and }})
const PLACEHOLDER_KEYS = [
  'clientName',
  'serviceName',
  'appointmentDate',
  'appointmentTime',
  'providerName',
  'organizationName',
  'appointmentLink',
  'confirmationLink',
];

interface EditingTemplate {
  templateType: MessageTemplateType;
  emailSubject: string;
  messageContent: string;
  originalId?: string;
}

interface WhatsAppTemplateStatus {
  templateType: MessageTemplateType;
  status: 'not_created' | 'pending' | 'approved' | 'rejected';
  templateName?: string;
  language?: string;
}

export function MessageTemplatesCard() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { currentOrganization, isAdmin } = useOrganizationContext();
  
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<MessageTemplateType | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<MessageTemplateType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<MessageTemplateType | null>(null);
  const [resetting, setResetting] = useState(false);
  
  // WhatsApp Business Template state
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppBusinessTemplate[]>([]);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [syncingWhatsApp, setSyncingWhatsApp] = useState(false);
  const [creatingWhatsApp, setCreatingWhatsApp] = useState<MessageTemplateType | null>(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState<MessageTemplateType | null>(null);
  const [selectedWhatsAppLanguage, setSelectedWhatsAppLanguage] = useState('en_US');
  const [showLinkDialog, setShowLinkDialog] = useState<MessageTemplateType | null>(null);
  const [selectedExistingTemplate, setSelectedExistingTemplate] = useState<string>('');

  const fetchTemplates = async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const res = await messageTemplatesApi.getAll(currentOrganization.id);
      const data = res.data as AllMessageTemplatesResponse;
      setTemplates(data.templates);
      setPlaceholders(data.availablePlaceholders);
    } catch (error) {
      console.error("Failed to fetch message templates", error);
      toast({
        title: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppTemplates = async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const res = await notificationSettingsApi.listBusinessTemplates(currentOrganization.id);
      const data = res.data as WhatsAppBusinessTemplatesListResponse;
      setWhatsAppTemplates(data.templates || []);
      setWhatsAppConnected(data.isConnected);
    } catch (error) {
      console.error("Failed to fetch WhatsApp templates", error);
      setWhatsAppConnected(false);
    }
  };

  const syncWhatsAppTemplates = async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setSyncingWhatsApp(true);
    try {
      const res = await notificationSettingsApi.syncBusinessTemplates(currentOrganization.id);
      const data = res.data;
      setWhatsAppTemplates(data.templates || []);
      toast({ 
        title: t('messageTemplates.whatsApp.syncSuccess') || "WhatsApp templates synced",
        description: `${data.synced} template(s) updated`,
      });
    } catch (error) {
      console.error("Failed to sync WhatsApp templates", error);
      toast({
        title: t('messageTemplates.whatsApp.syncFailed') || "Failed to sync templates",
        variant: "destructive",
      });
    } finally {
      setSyncingWhatsApp(false);
    }
  };

  const createWhatsAppTemplate = async (templateType: MessageTemplateType, messageContent: string) => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setCreatingWhatsApp(templateType);
    try {
      const eventTypes = TEMPLATE_TO_WHATSAPP_EVENT[templateType];
      if (!eventTypes?.length) {
        throw new Error("No event type mapping found");
      }

      // Create template for the first event type (primary)
      await notificationSettingsApi.createBusinessTemplateFromMessage(currentOrganization.id, {
        eventType: eventTypes[0],
        messageContent,
        language: selectedWhatsAppLanguage,
      });

      toast({ 
        title: t('messageTemplates.whatsApp.createSuccess') || "WhatsApp template created",
        description: t('messageTemplates.whatsApp.pendingApproval') || "Template submitted for Meta approval",
      });
      setShowWhatsAppDialog(null);
      await fetchWhatsAppTemplates();
    } catch (error: any) {
      console.error("Failed to create WhatsApp template", error);
      toast({
        title: t('messageTemplates.whatsApp.createFailed') || "Failed to create template",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setCreatingWhatsApp(null);
    }
  };

  const linkExistingTemplate = async (templateType: MessageTemplateType) => {
    if (!currentOrganization || !selectedExistingTemplate) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    const eventTypes = TEMPLATE_TO_WHATSAPP_EVENT[templateType];
    if (!eventTypes?.length) return;

    try {
      const selectedTemplate = whatsAppTemplates.find(t => t.id === selectedExistingTemplate);
      if (!selectedTemplate) return;

      await notificationSettingsApi.linkTemplateToEvent(currentOrganization.id, {
        eventType: eventTypes[0],
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
      });

      toast({ title: t('messageTemplates.whatsApp.linkSuccess') || "Template linked successfully" });
      setShowLinkDialog(null);
      setSelectedExistingTemplate('');
      await fetchWhatsAppTemplates();
    } catch (error) {
      console.error("Failed to link template", error);
      toast({
        title: t('messageTemplates.whatsApp.linkFailed') || "Failed to link template",
        variant: "destructive",
      });
    }
  };

  const getWhatsAppStatusForTemplate = (templateType: MessageTemplateType): WhatsAppTemplateStatus => {
    const eventTypes = TEMPLATE_TO_WHATSAPP_EVENT[templateType];
    if (!eventTypes?.length) {
      return { templateType, status: 'not_created' };
    }

    // Find any WhatsApp template linked to one of the event types
    const linkedTemplate = whatsAppTemplates.find(t => 
      eventTypes.includes(t.localEventType as WhatsAppEventType)
    );

    if (!linkedTemplate) {
      return { templateType, status: 'not_created' };
    }

    let status: WhatsAppTemplateStatus['status'] = 'pending';
    if (linkedTemplate.status === 'APPROVED') {
      status = 'approved';
    } else if (linkedTemplate.status === 'REJECTED' || linkedTemplate.status === 'DISABLED') {
      status = 'rejected';
    }

    return {
      templateType,
      status,
      templateName: linkedTemplate.name,
      language: linkedTemplate.language,
    };
  };

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchTemplates();
      fetchWhatsAppTemplates();
    }
  }, [currentOrganization, getToken, isAdmin]);

  const handleSaveTemplate = async (template: EditingTemplate) => {
    if (!currentOrganization) return;

    setSaving(template.templateType);
    try {
      await messageTemplatesApi.createOrUpdate(currentOrganization.id, {
        templateType: template.templateType,
        emailSubject: template.emailSubject,
        messageContent: template.messageContent,
      });
      
      toast({ title: "Template saved successfully" });
      setEditingTemplate(null);
      setExpandedTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error("Failed to save template", error);
      toast({
        title: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleResetTemplate = async (templateType: MessageTemplateType) => {
    if (!currentOrganization) return;

    setResetting(true);
    try {
      // Fetch localized default template from backend
      const response = await messageTemplatesApi.getDefaultTemplateByType(templateType, locale);
      const defaultTemplate = response.data as { emailSubject: string; messageContent: string };
      
      // Save with localized defaults
      await messageTemplatesApi.createOrUpdate(currentOrganization.id, {
        templateType,
        emailSubject: defaultTemplate.emailSubject || undefined,
        messageContent: defaultTemplate.messageContent || '',
      });
      
      toast({ title: t('messageTemplates.resetSuccess') || "Template reset to default" });
      setShowResetDialog(null);
      setExpandedTemplate(null);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error: any) {
      console.error("Failed to reset template", error);
      toast({
        title: "Failed to reset template",
        variant: "destructive",
      });
      setShowResetDialog(null);
    } finally {
      setResetting(false);
    }
  };

  const startEditing = (template: MessageTemplate) => {
    setEditingTemplate({
      templateType: template.templateType,
      emailSubject: template.emailSubject || "",
      messageContent: template.messageContent,
      originalId: template.id,
    });
    setExpandedTemplate(template.templateType);
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('messageTemplates.title') || 'Message Templates'}
              </CardTitle>
              <CardDescription>
                {t('messageTemplates.description') || 'Customize the messages sent to clients via Email, SMS, and WhatsApp.'}
              </CardDescription>
            </div>
            {whatsAppConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncWhatsAppTemplates}
                disabled={syncingWhatsApp}
              >
                {syncingWhatsApp ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                {t('messageTemplates.whatsApp.sync') || 'Sync WhatsApp'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WhatsApp Connection Status */}
          {!whatsAppConnected && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('messageTemplates.whatsApp.notConnected') || 'WhatsApp Business not connected'}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                {t('messageTemplates.whatsApp.connectHint') || 'Connect WhatsApp Business in notification settings to create and manage templates.'}
              </p>
            </div>
          )}

          {/* Available Placeholders Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm w-full">
                <p className="font-medium mb-3">{t('messageTemplates.placeholdersTitle') || 'Available Placeholders:'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLACEHOLDER_KEYS.map((key) => (
                    <div key={key} className="flex items-start gap-2">
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {`{{${key}}}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t(`messageTemplates.placeholders.${key}`) || key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Template List */}
          <div className="space-y-3">
            {templates.map((template) => {
              const TypeIcon = TEMPLATE_TYPE_INFO[template.templateType]?.icon || MessageSquare;
              const iconColor = TEMPLATE_TYPE_INFO[template.templateType]?.color || "text-gray-500";
              const isExpanded = expandedTemplate === template.templateType;
              const isEditing = editingTemplate?.templateType === template.templateType;
              const isSaving = saving === template.templateType;
              const whatsAppStatus = getWhatsAppStatusForTemplate(template.templateType);
              
              // Get localized label and description
              const templateLabel = t(`messageTemplates.templateTypes.${template.templateType}.label`) || template.templateType;
              const templateDescription = t(`messageTemplates.templateTypes.${template.templateType}.description`) || '';

              return (
                <div key={template.templateType} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedTemplate(null);
                          setEditingTemplate(null);
                        } else {
                          setExpandedTemplate(template.templateType);
                          startEditing(template);
                        }
                      }}
                    >
                      <TypeIcon className={`h-5 w-5 ${iconColor}`} />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {templateLabel}
                          </h4>
                          {/* WhatsApp Status Badge */}
                          {whatsAppConnected && (
                            <Badge 
                              variant={
                                whatsAppStatus.status === 'approved' ? 'default' :
                                whatsAppStatus.status === 'pending' ? 'secondary' :
                                whatsAppStatus.status === 'rejected' ? 'destructive' :
                                'outline'
                              }
                              className="text-xs gap-1"
                            >
                              {whatsAppStatus.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                              {whatsAppStatus.status === 'pending' && <Clock className="h-3 w-3" />}
                              {whatsAppStatus.status === 'rejected' && <AlertTriangle className="h-3 w-3" />}
                              {whatsAppStatus.status === 'not_created' && <CloudOff className="h-3 w-3" />}
                              {whatsAppStatus.status === 'approved' ? 'WhatsApp Ready' :
                               whatsAppStatus.status === 'pending' ? 'Pending Approval' :
                               whatsAppStatus.status === 'rejected' ? 'Rejected' :
                               'No WhatsApp Template'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {templateDescription}
                        </p>
                      </div>
                    </div>
                    <div
                      className="cursor-pointer p-1"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedTemplate(null);
                          setEditingTemplate(null);
                        } else {
                          setExpandedTemplate(template.templateType);
                          startEditing(template);
                        }
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && isEditing && editingTemplate && (
                    <div className="border-t p-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`subject-${template.templateType}`}>
                          {t('messageTemplates.emailSubject') || 'Email Subject'}
                        </Label>
                        <Input
                          id={`subject-${template.templateType}`}
                          value={editingTemplate.emailSubject}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              emailSubject: e.target.value,
                            })
                          }
                          placeholder="Enter email subject..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`content-${template.templateType}`}>
                          {t('messageTemplates.messageContent') || 'Message Content'}
                        </Label>
                        <Textarea
                          id={`content-${template.templateType}`}
                          value={editingTemplate.messageContent}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              messageContent: e.target.value,
                            })
                          }
                          placeholder="Enter message content..."
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('messageTemplates.contentHint') || 'Use placeholders above to personalize messages. The same content is used for Email body, SMS, and WhatsApp.'}
                        </p>
                      </div>

                      {/* WhatsApp Template Actions */}
                      {whatsAppConnected && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium flex items-center gap-2">
                                <Cloud className="h-4 w-4" />
                                {t('messageTemplates.whatsApp.title') || 'WhatsApp Business Template'}
                              </p>
                              {whatsAppStatus.templateName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Template: {whatsAppStatus.templateName} ({whatsAppStatus.language})
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {whatsAppStatus.status === 'not_created' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowLinkDialog(template.templateType)}
                                  >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    {t('messageTemplates.whatsApp.link') || 'Link Existing'}
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowWhatsAppDialog(template.templateType)}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {t('messageTemplates.whatsApp.create') || 'Create in WhatsApp'}
                                  </Button>
                                </>
                              )}
                              {whatsAppStatus.status === 'rejected' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setShowWhatsAppDialog(template.templateType)}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {t('messageTemplates.whatsApp.recreate') || 'Recreate Template'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowResetDialog(template.templateType)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {t('messageTemplates.resetToDefault') || 'Reset to Default'}
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExpandedTemplate(null);
                              setEditingTemplate(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveTemplate(editingTemplate)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Template
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={!!showResetDialog} onOpenChange={() => setShowResetDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Template to Default</DialogTitle>
            <DialogDescription>
              This will replace your custom template with the default content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showResetDialog && handleResetTemplate(showResetDialog)}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create WhatsApp Template Dialog */}
      <Dialog open={!!showWhatsAppDialog} onOpenChange={() => setShowWhatsAppDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('messageTemplates.whatsApp.createDialogTitle') || 'Create WhatsApp Business Template'}
            </DialogTitle>
            <DialogDescription>
              {t('messageTemplates.whatsApp.createDialogDescription') || 'This will create a new template in your WhatsApp Business account and submit it for Meta approval. Once approved, it can be used to send notifications.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('messageTemplates.whatsApp.language') || 'Template Language'}</Label>
              <Select value={selectedWhatsAppLanguage} onValueChange={setSelectedWhatsAppLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('messageTemplates.whatsApp.approvalNote') || 'Note: WhatsApp templates require Meta approval which typically takes 24-48 hours. The template will be submitted using your current message content.'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => {
                if (showWhatsAppDialog) {
                  const template = templates.find(t => t.templateType === showWhatsAppDialog);
                  if (template) {
                    createWhatsAppTemplate(showWhatsAppDialog, template.messageContent);
                  }
                }
              }}
              disabled={creatingWhatsApp === showWhatsAppDialog}
            >
              {creatingWhatsApp === showWhatsAppDialog ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('messageTemplates.whatsApp.creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('messageTemplates.whatsApp.createAndSubmit') || 'Create & Submit for Approval'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Existing Template Dialog */}
      <Dialog open={!!showLinkDialog} onOpenChange={() => { setShowLinkDialog(null); setSelectedExistingTemplate(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('messageTemplates.whatsApp.linkDialogTitle') || 'Link Existing WhatsApp Template'}
            </DialogTitle>
            <DialogDescription>
              {t('messageTemplates.whatsApp.linkDialogDescription') || 'Select an existing approved template from your WhatsApp Business account to use for this notification type.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('messageTemplates.whatsApp.selectTemplate') || 'Select Template'}</Label>
              <Select value={selectedExistingTemplate} onValueChange={setSelectedExistingTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder={t('messageTemplates.whatsApp.selectTemplatePlaceholder') || 'Choose a template...'} />
                </SelectTrigger>
                <SelectContent>
                  {whatsAppTemplates
                    .filter(t => t.status === 'APPROVED')
                    .map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.language})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {whatsAppTemplates.filter(t => t.status === 'APPROVED').length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('messageTemplates.whatsApp.noApprovedTemplates') || 'No approved templates found. Create a new template instead.'}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLinkDialog(null); setSelectedExistingTemplate(''); }}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => showLinkDialog && linkExistingTemplate(showLinkDialog)}
              disabled={!selectedExistingTemplate}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {t('messageTemplates.whatsApp.linkTemplate') || 'Link Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
