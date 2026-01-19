"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { serviceOptionsApi, setAuthToken } from "@/lib/api";
import { ServiceOption } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Clock, Image } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ServiceOptionsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("optionsPage");
  const tCommon = useTranslations("common");
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ServiceOption | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    duration: 30,
  });

  const fetchOptions = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const res = await serviceOptionsApi.getAll();
      setOptions(res.data);
    } catch (error) {
      console.error("Failed to fetch service options", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [getToken]);

  const openCreateDialog = () => {
    setEditingOption(null);
    setFormData({ title: "", description: "", imageUrl: "", duration: 30 });
    setDialogOpen(true);
  };

  const openEditDialog = (option: ServiceOption) => {
    setEditingOption(option);
    setFormData({
      title: option.title,
      description: option.description || "",
      imageUrl: option.imageUrl || "",
      duration: option.duration,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingOption) {
        await serviceOptionsApi.update(editingOption.id, formData);
        toast({ title: t("messages.updated") });
      } else {
        await serviceOptionsApi.create(formData);
        toast({ title: t("messages.created") });
      }
      setDialogOpen(false);
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      await serviceOptionsApi.delete(id);
      toast({ title: t("messages.deleted") });
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (option: ServiceOption) => {
    try {
      await serviceOptionsApi.update(option.id, { isActive: !option.isActive });
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.updateFailed"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          {t("description")}
        </p>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addService")}
        </Button>
      </div>

      {options.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t("empty.title")} {t("empty.description")}
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("empty.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {options.map((option) => (
            <Card key={option.id} className={!option.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={option.isActive}
                      onCheckedChange={() => handleToggleActive(option)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {option.imageUrl && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={option.imageUrl}
                      alt={option.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!option.imageUrl && (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {option.description || t("noDescription")}
                </p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {option.duration} {tCommon("minutes")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(option)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {tCommon("edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(option.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? t("dialog.editTitle") : t("dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("dialog.title")}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("dialog.titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("dialog.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("dialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">{t("dialog.imageUrl")}</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t("dialog.duration")}</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title}>
              {editingOption ? tCommon("update") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
