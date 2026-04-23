"use client";

import { useEffect, useState } from "react";
import { bookingLinksApi, serviceOptionsApi } from "@/lib/api";
import { BookingLink, BookingLinkType, ServiceOption } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy, Trash2, Link2, ExternalLink, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BookingLinksPage() {
  const { toast } = useToast();
  const { currentOrganization, isAdmin, userRole } = useOrganizationContext();
  const t = useTranslations("linksPage");
  const tCommon = useTranslations("common");
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: BookingLinkType.ALL_OPTIONS,
    serviceOptionId: "",
    expiresAt: "",
  });

  // Check if user can create/edit/delete links (only admins in org context)
  const canManageLinks = currentOrganization && isAdmin;

  const fetchData = async () => {
    try {
      if (!currentOrganization) {
        // Booking links require organization context
        setLinks([]);
        setServiceOptions([]);
        setLoading(false);
        return;
      }

      // Fetch organization links and services
      const [linksRes, optionsRes] = await Promise.all([
        bookingLinksApi.getAll(),
        serviceOptionsApi.getAllForOrganization(),
      ]);

      setLinks(linksRes.data);
      setServiceOptions(optionsRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  const handleCreate = async () => {
    if (!currentOrganization) return;
    
    try {
      await bookingLinksApi.create({
        name: formData.name || undefined,
        type: formData.type,
        serviceOptionId:
          formData.type === BookingLinkType.SPECIFIC_OPTION
            ? formData.serviceOptionId
            : undefined,
        expiresAt: formData.expiresAt || undefined,
      });
      toast({ title: t("messages.created") });
      setDialogOpen(false);
      setFormData({
        name: "",
        type: BookingLinkType.ALL_OPTIONS,
        serviceOptionId: "",
        expiresAt: "",
      });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.createFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    if (!currentOrganization) return;

    try {
      await bookingLinksApi.delete(id);
      toast({ title: t("messages.deleted") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (link: BookingLink) => {
    if (!currentOrganization) return;
    
    try {
      await bookingLinksApi.update(link.id, { isActive: !link.isActive });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.updateFailed"),
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t("messages.copied"),
      description: t("messages.copiedDesc"),
    });
  };

  const getBookingUrl = (slug: string) => {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show message if no organization is selected
  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            {t("noOrganization") || "Please select an organization to manage booking links. Booking links belong to organizations."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info alert for non-admin members */}
      {currentOrganization && !isAdmin && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            {t("memberViewOnly") || "You can view and copy booking links. Only administrators can create, edit, or delete links."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          {t("description")}
        </p>
        {canManageLinks && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createLink")}
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t("empty.title")} {t("empty.description")}
            </p>
            {canManageLinks && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("empty.createFirst")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card
              key={link.id}
              className={!link.isActive ? "opacity-60" : ""}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {link.name || t("bookingLink")}
                      </h3>
                      <Badge variant={link.isActive ? "default" : "secondary"}>
                        {link.isActive ? tCommon("active") : tCommon("inactive")}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {link.type === BookingLinkType.ALL_OPTIONS
                        ? t("allServices")
                        : link.type === BookingLinkType.SPECIFIC_OPTION
                        ? `${t("specificService")} ${link.serviceOption?.title || ""}`
                        : t("campaignLink")}
                    </p>

                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {getBookingUrl(link.slug)}
                      </code>
                    </div>

                    {link.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        {t("expires")} {format(parseISO(link.expiresAt), "PPP")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.slug)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {t("actions.copy")}
                    </Button>
                    <a
                      href={getBookingUrl(link.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    {canManageLinks && (
                      <>
                        <Switch
                          checked={link.isActive}
                          onCheckedChange={() => handleToggleActive(link)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("dialog.name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("dialog.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("dialog.linkType")}</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v as BookingLinkType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BookingLinkType.ALL_OPTIONS}>
                    {t("dialog.types.allServices")}
                  </SelectItem>
                  <SelectItem value={BookingLinkType.SPECIFIC_OPTION}>
                    {t("dialog.types.specificService")}
                  </SelectItem>
                  <SelectItem value={BookingLinkType.CAMPAIGN}>
                    {t("dialog.types.campaign")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === BookingLinkType.SPECIFIC_OPTION && (
              <div className="space-y-2">
                <Label>{t("dialog.service")}</Label>
                <Select
                  value={formData.serviceOptionId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, serviceOptionId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialog.selectService")} />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">{t("dialog.expirationDate")}</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                formData.type === BookingLinkType.SPECIFIC_OPTION &&
                !formData.serviceOptionId
              }
            >
              {t("createLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
