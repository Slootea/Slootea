"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { availabilityApi, serviceOptionsApi, setAuthToken } from "@/lib/api";
import { Availability, ServiceOption, DayOfWeek } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AvailabilityPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("availability");
  const tCommon = useTranslations("common");
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: "09:00",
    endTime: "17:00",
    serviceOptionId: "",
  });

  const fetchData = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const [availRes, optionsRes] = await Promise.all([
        availabilityApi.getAll(),
        serviceOptionsApi.getAll(),
      ]);
      setAvailabilities(availRes.data);
      setServiceOptions(optionsRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getToken]);

  const handleCreate = async () => {
    try {
      await availabilityApi.create({
        ...formData,
        serviceOptionId: formData.serviceOptionId || undefined,
      });
      toast({ title: t("messages.created") });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.created"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await availabilityApi.delete(id);
      toast({ title: t("messages.deleted") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleted"),
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (availability: Availability) => {
    try {
      await availabilityApi.update(availability.id, {
        isActive: !availability.isActive,
      });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.updated"),
        variant: "destructive",
      });
    }
  };

  // Group availabilities by day
  const groupedByDay = availabilities.reduce((acc, av) => {
    if (!acc[av.dayOfWeek]) acc[av.dayOfWeek] = [];
    acc[av.dayOfWeek].push(av);
    return acc;
  }, {} as Record<DayOfWeek, Availability[]>);

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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addTimeSlot")}
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.values(DayOfWeek)
          .filter((d) => typeof d === "number")
          .map((day) => (
            <Card key={day}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">
                  {t(`dayOfWeek.${day}`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!groupedByDay[day as DayOfWeek] ||
                groupedByDay[day as DayOfWeek].length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("noAvailability")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupedByDay[day as DayOfWeek].map((av) => (
                      <div
                        key={av.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          av.isActive ? "bg-white" : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {av.startTime} - {av.endTime}
                          </span>
                          {av.serviceOption && (
                            <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                              {av.serviceOption.title}
                            </span>
                          )}
                          {!av.serviceOptionId && (
                            <span className="text-sm text-muted-foreground">
                              {t("allServices")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={av.isActive}
                            onCheckedChange={() => handleToggleActive(av)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(av.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("dialog.dayOfWeek")}</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(v) =>
                  setFormData({ ...formData, dayOfWeek: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DayOfWeek)
                    .filter((d) => typeof d === "number")
                    .map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        {t(`dayOfWeek.${value}`)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">{t("dialog.startTime")}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t("dialog.endTime")}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("dialog.service")}</Label>
              <Select
                value={formData.serviceOptionId || "__all__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, serviceOptionId: v === "__all__" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("allServices")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{tCommon("allServices")}</SelectItem>
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("dialog.serviceHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleCreate}>{tCommon("create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
