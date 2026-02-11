"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { messageTemplatesApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { MessageTemplate, MessageTemplateType, AllMessageTemplatesResponse } from "@/lib/types";
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
} from "lucide-react";

const TEMPLATE_TYPE_INFO: Record<MessageTemplateType, { icon: React.ElementType; color: string }> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: { icon: Calendar, color: "text-green-500" },
  [MessageTemplateType.APPOINTMENT_REMINDER]: { icon: Bell, color: "text-blue-500" },
  [MessageTemplateType.APPOINTMENT_UPDATED]: { icon: RefreshCw, color: "text-orange-500" },
  [MessageTemplateType.APPOINTMENT_CANCELED]: { icon: XCircle, color: "text-red-500" },
};

const TEMPLATE_TYPE_LABELS: Record<MessageTemplateType, string> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: "Appointment Confirmation",
  [MessageTemplateType.APPOINTMENT_REMINDER]: "Appointment Reminder",
  [MessageTemplateType.APPOINTMENT_UPDATED]: "Appointment Updated",
  [MessageTemplateType.APPOINTMENT_CANCELED]: "Appointment Cancellation",
};

const TEMPLATE_TYPE_DESCRIPTIONS: Record<MessageTemplateType, string> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: "Sent when a client books an appointment. Includes the appointment link for editing or canceling.",
  [MessageTemplateType.APPOINTMENT_REMINDER]: "Sent before the appointment as a reminder. Includes a confirmation link.",
  [MessageTemplateType.APPOINTMENT_UPDATED]: "Sent when an organization reschedules or updates an appointment.",
  [MessageTemplateType.APPOINTMENT_CANCELED]: "Sent when an appointment is canceled by the organization.",
};

interface EditingTemplate {
  templateType: MessageTemplateType;
  emailSubject: string;
  messageContent: string;
  originalId?: string;
}

export function MessageTemplatesCard() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('organization');
  const { currentOrganization, isAdmin } = useOrganizationContext();
  
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<MessageTemplateType | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<MessageTemplateType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<MessageTemplateType | null>(null);
  const [resetting, setResetting] = useState(false);

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

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchTemplates();
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
      await messageTemplatesApi.resetToDefault(currentOrganization.id, templateType);
      toast({ title: "Template reset to default" });
      setShowResetDialog(null);
      await fetchTemplates();
    } catch (error: any) {
      // If no custom template exists, that's okay
      if (error.response?.status === 404) {
        toast({ title: "Template is already using default" });
      } else {
        console.error("Failed to reset template", error);
        toast({
          title: "Failed to reset template",
          variant: "destructive",
        });
      }
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('messageTemplates.title') || 'Message Templates'}
          </CardTitle>
          <CardDescription>
            {t('messageTemplates.description') || 'Customize the messages sent to clients via Email, SMS, and WhatsApp.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Available Placeholders Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-2">{t('messageTemplates.placeholdersTitle') || 'Available Placeholders:'}</p>
                <div className="flex flex-wrap gap-1">
                  {placeholders.map((ph) => (
                    <Badge key={ph} variant="secondary" className="font-mono text-xs">
                      {ph}
                    </Badge>
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
                      <div className="text-left">
                        <h4 className="font-medium">
                          {TEMPLATE_TYPE_LABELS[template.templateType]}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {TEMPLATE_TYPE_DESCRIPTIONS[template.templateType]}
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
    </>
  );
}
