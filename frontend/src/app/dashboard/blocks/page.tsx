"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { blockedTimesApi, setAuthToken } from "@/lib/api";
import { BlockedTime } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, CalendarX } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

export default function BlockedTimesPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("blocksPage");
  const tCommon = useTranslations("common");
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    isFullDay: false,
    reason: "",
  });

  const fetchData = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const res = await blockedTimesApi.getAll();
      setBlockedTimes(res.data);
    } catch (error) {
      console.error("Failed to fetch blocked times", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getToken]);

  const handleCreate = async () => {
    try {
      await blockedTimesApi.create({
        date: formData.date,
        startTime: formData.isFullDay ? undefined : formData.startTime,
        endTime: formData.isFullDay ? undefined : formData.endTime,
        isFullDay: formData.isFullDay,
        reason: formData.reason || undefined,
      });
      toast({ title: t("messages.created") });
      setDialogOpen(false);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        isFullDay: false,
        reason: "",
      });
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
      await blockedTimesApi.delete(id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Group blocked times by date
  const upcoming = blockedTimes
    .filter((bt) => new Date(bt.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = blockedTimes
    .filter((bt) => new Date(bt.date) < new Date(new Date().toDateString()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          {t("description")}
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("blockTime")}
        </Button>
      </div>

      {blockedTimes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t("empty.title")} {t("empty.description")}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("blockTime")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("upcomingBlocked")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcoming.map((bt) => (
                    <BlockedTimeItem
                      key={bt.id}
                      blockedTime={bt}
                      onDelete={handleDelete}
                      t={t}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {past.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">
                  {t("pastBlocked")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 opacity-60">
                  {past.slice(0, 10).map((bt) => (
                    <BlockedTimeItem
                      key={bt.id}
                      blockedTime={bt}
                      onDelete={handleDelete}
                      t={t}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
              <Label htmlFor="date">{t("dialog.date")}</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isFullDay"
                checked={formData.isFullDay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFullDay: checked })
                }
              />
              <Label htmlFor="isFullDay">{t("dialog.blockEntireDay")}</Label>
            </div>
            {!formData.isFullDay && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">{t("dialog.reason")}</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder={t("dialog.reasonPlaceholder")}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleCreate}>{t("blockTime")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockedTimeItem({
  blockedTime,
  onDelete,
  t,
}: {
  blockedTime: BlockedTime;
  onDelete: (id: string) => void;
  t: any;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
      <div>
        <p className="font-medium">
          {format(parseISO(blockedTime.date), "EEEE, MMMM d, yyyy")}
        </p>
        <p className="text-sm text-muted-foreground">
          {blockedTime.isFullDay
            ? t("fullDay")
            : `${blockedTime.startTime} - ${blockedTime.endTime}`}
          {blockedTime.reason && ` • ${blockedTime.reason}`}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onDelete(blockedTime.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
