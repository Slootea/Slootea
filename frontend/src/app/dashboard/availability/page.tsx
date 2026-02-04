"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { availabilityApi, serviceOptionsApi, userServiceOptionsApi, blockedTimesApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { Availability, ServiceOption, DayOfWeek, UserServiceOption, BlockedTime } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, addDays } from "date-fns";
import { 
  Plus, 
  Trash2, 
  Clock, 
  Copy, 
  Calendar, 
  CheckCircle2,
  Zap,
  CalendarDays,
  Timer,
  AlertCircle,
  List,
  ChevronRight,
  Edit3,
  CalendarX,
  Ban,
  CalendarOff,
  Sparkles,
  ChevronDown,
  MoreHorizontal,
  Briefcase,
  Sunrise,
  Moon,
} from "lucide-react";
import { useTranslations } from "next-intl";

// Import extracted components
import {
  VisualTimeRangePicker,
  BlockTimeRangePicker,
  WeeklyOverview,
  LoadingSkeleton,
  StatsCard,
  SCHEDULE_TEMPLATES,
  type ScheduleTemplateKey,
} from "@/components/availability";

export default function AvailabilityPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("availability");
  const tBlocks = useTranslations("blocksPage");
  const tCommon = useTranslations("common");
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [assignedServices, setAssignedServices] = useState<UserServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [blockTimeDialogOpen, setBlockTimeDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null);
  const [copyFromDay, setCopyFromDay] = useState<DayOfWeek | null>(null);
  const [selectedCopyDays, setSelectedCopyDays] = useState<DayOfWeek[]>([]);
  const [formData, setFormData] = useState({
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: "09:00",
    endTime: "17:00",
    serviceOptionId: "",
  });
  const [blockFormData, setBlockFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    isFullDay: false,
    reason: "",
  });
  const [editingBlockTime, setEditingBlockTime] = useState<BlockedTime | null>(null);
  const [blockTimeTab, setBlockTimeTab] = useState<"add" | "manage">("add");

  const isOrgMember = !!(currentOrganization && userRole === 'member');

  const availableServicesForSelection = useMemo(() => {
    if (isOrgMember) {
      return assignedServices
        .filter(as => as.isActive && as.serviceOption)
        .map(as => as.serviceOption!);
    }
    return serviceOptions;
  }, [isOrgMember, assignedServices, serviceOptions]);

  const hasNoAssignedServices = isOrgMember && availableServicesForSelection.length === 0;

  const fetchData = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);

    if (currentOrganization) {
      setOrganizationContext(currentOrganization.id);
    }

    try {
      const requests: Promise<any>[] = [
        availabilityApi.getAll(),
        blockedTimesApi.getAll(),
      ];

      if (currentOrganization) {
        requests.push(serviceOptionsApi.getAllForOrganization());
        requests.push(userServiceOptionsApi.getMyServices());
      } else {
        requests.push(serviceOptionsApi.getAll());
      }

      const results = await Promise.all(requests);
      
      setAvailabilities(results[0].data);
      setBlockedTimes(results[1].data);
      setServiceOptions(results[2].data);
      
      if (results[3]) {
        setAssignedServices(results[3].data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, currentOrganization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedByDay = useMemo(() => {
    return availabilities.reduce((acc, av) => {
      if (!acc[av.dayOfWeek]) acc[av.dayOfWeek] = [];
      acc[av.dayOfWeek].push(av);
      acc[av.dayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    }, {} as Record<DayOfWeek, Availability[]>);
  }, [availabilities]);

  const stats = useMemo(() => {
    const activeSlots = availabilities.filter(a => a.isActive);
    const daysWithAvailability = new Set(activeSlots.map(a => a.dayOfWeek)).size;
    const totalHours = activeSlots.reduce((total, slot) => {
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      return total + (endH * 60 + endM - startH * 60 - startM) / 60;
    }, 0);
    return { activeSlots: activeSlots.length, daysWithAvailability, totalHours };
  }, [availabilities]);

  // Blocked times stats
  const upcomingBlockedTimes = useMemo(() => {
    return blockedTimes
      .filter((bt) => new Date(bt.date) >= new Date(new Date().toDateString()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [blockedTimes]);

  // Get current day of week (Monday = 0)
  const todayDayOfWeek = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1; // Convert JS day (Sunday=0) to our format (Monday=0)
  }, []);

  const handleCreate = async () => {
    try {
      if (editingSlot) {
        await availabilityApi.update(editingSlot.id, {
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });
        toast({ title: t("messages.updated") });
      } else {
        await availabilityApi.create({
          ...formData,
          serviceOptionId: formData.serviceOptionId || undefined,
        });
        toast({ title: t("messages.created") });
      }
      setDialogOpen(false);
      setEditingSlot(null);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: editingSlot ? t("messages.updateError") : t("messages.createError"),
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
        description: t("messages.deleteError"),
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
        description: t("messages.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleAddSlotToDay = (day: DayOfWeek) => {
    setEditingSlot(null);
    const defaultServiceId = isOrgMember && availableServicesForSelection.length > 0
      ? availableServicesForSelection[0].id
      : "";
    setFormData({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      serviceOptionId: defaultServiceId,
    });
    setDialogOpen(true);
  };

  const handleEditSlot = (slot: Availability) => {
    setEditingSlot(slot);
    setFormData({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      serviceOptionId: slot.serviceOptionId || "",
    });
    setDialogOpen(true);
  };

  const handleApplyTemplate = async (templateKey: ScheduleTemplateKey) => {
    const template = SCHEDULE_TEMPLATES[templateKey];
    const newSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    
    template.days.forEach((day) => {
      template.slots.forEach((slot) => {
        newSlots.push({
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      });
    });

    try {
      await availabilityApi.deleteAll();
      await availabilityApi.createBulk({ availabilities: newSlots });
      toast({ title: t("messages.templateApplied") });
      setTemplateDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.templateError"),
        variant: "destructive",
      });
    }
  };

  const handleCopyDay = (fromDay: DayOfWeek) => {
    setCopyFromDay(fromDay);
    setSelectedCopyDays([]);
    setCopyDialogOpen(true);
  };

  const handleConfirmCopyDay = async () => {
    if (copyFromDay === null || selectedCopyDays.length === 0) return;
    
    const slotsToCopy = groupedByDay[copyFromDay] || [];
    const newSlots = selectedCopyDays.flatMap((targetDay) =>
      slotsToCopy.map((slot) => ({
        dayOfWeek: targetDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
        serviceOptionId: slot.serviceOptionId,
      }))
    );

    try {
      await availabilityApi.createBulk({ availabilities: newSlots });
      toast({ title: t("messages.slotsCopied") });
      setCopyDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.copyError"),
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await availabilityApi.deleteAll();
      toast({ title: t("messages.clearedAll") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.clearError"),
        variant: "destructive",
      });
    }
  };

  // Block time handlers
  const handleCreateBlockTime = async () => {
    try {
      const payload: any = {
        date: blockFormData.date,
        isFullDay: blockFormData.isFullDay,
        reason: blockFormData.reason || undefined,
      };
      
      if (!blockFormData.isFullDay) {
        payload.startTime = blockFormData.startTime;
        payload.endTime = blockFormData.endTime;
      }

      if (editingBlockTime) {
        await blockedTimesApi.update(editingBlockTime.id, payload);
        toast({ title: tBlocks("messages.updated") || "Blocked time updated" });
      } else {
        await blockedTimesApi.create(payload);
        toast({ title: tBlocks("messages.created") });
      }
      
      resetBlockForm();
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: editingBlockTime 
          ? (tBlocks("messages.updateError") || "Failed to update blocked time")
          : tBlocks("messages.createError"),
        variant: "destructive",
      });
    }
  };

  const handleEditBlockTime = (bt: BlockedTime) => {
    setEditingBlockTime(bt);
    setBlockFormData({
      date: bt.date.split('T')[0], // Handle ISO date format
      startTime: bt.startTime || "09:00",
      endTime: bt.endTime || "17:00",
      isFullDay: bt.isFullDay,
      reason: bt.reason || "",
    });
    setBlockTimeTab("add");
  };

  const resetBlockForm = () => {
    setEditingBlockTime(null);
    setBlockFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      isFullDay: false,
      reason: "",
    });
  };

  const handleDeleteBlockTime = async (id: string) => {
    try {
      await blockedTimesApi.delete(id);
      toast({ title: tBlocks("messages.deleted") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tBlocks("messages.deleteError"),
        variant: "destructive",
      });
    }
  };

  // Grouped blocked times for management tab
  const groupedBlockedTimes = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = blockedTimes
      .filter((bt) => new Date(bt.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const past = blockedTimes
      .filter((bt) => new Date(bt.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return { upcoming, past };
  }, [blockedTimes]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const dayNumbers = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];

  return (
    <div className="space-y-6">
      {/* Alert for members with no assigned services */}
      {hasNoAssignedServices && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            {t("noAssignedServicesAlert")}
          </AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      {availabilities.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground max-w-2xl">
            {isOrgMember ? t("descriptionMember") : t("description")}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {availabilities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            icon={CheckCircle2}
            label={t("activeSlots")}
            value={stats.activeSlots}
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-100 dark:bg-emerald-950"
          />
          <StatsCard
            icon={CalendarDays}
            label={t("daysConfigured")}
            value={`${stats.daysWithAvailability}/7`}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-100 dark:bg-blue-950"
          />
          <StatsCard
            icon={Timer}
            label={t("hoursPerWeek")}
            value={`${stats.totalHours.toFixed(1)}h`}
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100 dark:bg-purple-950"
          />
        </div>
      )}

      {/* Empty State */}
      {availabilities.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-6">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("emptyState.title")}</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              {t("emptyState.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setTemplateDialogOpen(true)} variant="outline" size="lg">
                <Zap className="h-4 w-4 mr-2" />
                {t("useTemplate")}
              </Button>
              <Button onClick={() => handleAddSlotToDay(DayOfWeek.MONDAY)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t("addManually")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Overview */}
      {availabilities.length > 0 && (
        <WeeklyOverview 
          groupedByDay={groupedByDay} 
          dayNumbers={dayNumbers} 
          todayDayOfWeek={todayDayOfWeek}
          onAddSlot={handleAddSlotToDay}
          onEditSlot={handleEditSlot}
          onOpenEditDialog={() => setEditScheduleDialogOpen(true)}
          onOpenBlockTimeDialog={() => setBlockTimeDialogOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onClearAll={handleClearAll}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSlot(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSlot ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingSlot ? t("dialog.editTitle") : t("dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {editingSlot ? t("dialog.editDescription") : t("dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Day selector with visual pills */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dialog.dayOfWeek")}</Label>
              <div className="flex flex-wrap gap-2">
                {dayNumbers.map((value) => {
                  const isSelected = formData.dayOfWeek === value;
                  const isWeekend = value === 5 || value === 6;
                  return (
                    <button
                      key={value}
                      onClick={() => setFormData({ ...formData, dayOfWeek: value })}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-all border
                        ${isSelected 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : isWeekend
                            ? "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-muted"
                            : "bg-background text-foreground border-border hover:bg-muted hover:border-muted"
                        }
                      `}
                    >
                      {t(`dayOfWeek.${value}`).slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Visual Time Range Picker */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dialog.selectTime")}</Label>
              <VisualTimeRangePicker
                startTime={formData.startTime}
                endTime={formData.endTime}
                onTimeChange={(start, end) => setFormData({ ...formData, startTime: start, endTime: end })}
              />
            </div>

            {/* Service selector */}
            {!editingSlot && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("dialog.service")}</Label>
                  {isOrgMember && availableServicesForSelection.length === 0 ? (
                    <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-400">
                        {t("noAssignedServices")}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
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
                          {!isOrgMember && (
                            <SelectItem value="__all__">{tCommon("allServices")}</SelectItem>
                          )}
                          {availableServicesForSelection.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {isOrgMember 
                          ? t("dialog.serviceHintMember")
                          : t("dialog.serviceHint")
                        }
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSlot(null); }}>
              {tCommon("cancel")}
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isOrgMember && !editingSlot && !formData.serviceOptionId}
            >
              {editingSlot ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t("templateDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("templateDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 py-4 pr-4">
              {Object.entries(SCHEDULE_TEMPLATES).map(([key, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleApplyTemplate(key as keyof typeof SCHEDULE_TEMPLATES)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="rounded-lg bg-muted p-3 group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{t(`templates.${key}`)}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {template.slots.map(s => `${s.startTime} - ${s.endTime}`).join(", ")}
                        {" • "}
                        {template.days.length === 7 ? t("allDays") : t("weekdays")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Copy Day Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              {t("copyDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("copyDialog.description", { day: copyFromDay !== null ? t(`dayOfWeek.${copyFromDay}`) : "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {dayNumbers
              .filter((d) => d !== copyFromDay)
              .map((day) => {
                const isSelected = selectedCopyDays.includes(day);
                const isWeekend = day === 5 || day === 6;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCopyDays(selectedCopyDays.filter((d) => d !== day));
                      } else {
                        setSelectedCopyDays([...selectedCopyDays, day]);
                      }
                    }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${isSelected 
                        ? "bg-primary/10 border-primary text-primary" 
                        : isWeekend
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${isSelected 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/30"
                      }
                    `}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="font-medium">{t(`dayOfWeek.${day}`)}</span>
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button 
              onClick={handleConfirmCopyDay}
              disabled={selectedCopyDays.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("copyDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              {t("editSchedule") || "Edit Schedule"}
            </DialogTitle>
            <DialogDescription>
              {t("editScheduleDesc") || "Manage your weekly availability schedule"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {dayNumbers.map((day) => {
                const slots = groupedByDay[day] || [];
                const isWeekend = day === 5 || day === 6;
                const isToday = day === todayDayOfWeek;
                const activeSlots = slots.filter(s => s.isActive);
                const totalHours = activeSlots.reduce((total, slot) => {
                  const [startH, startM] = slot.startTime.split(":").map(Number);
                  const [endH, endM] = slot.endTime.split(":").map(Number);
                  return total + (endH * 60 + endM - startH * 60 - startM) / 60;
                }, 0);

                return (
                  <div 
                    key={day} 
                    className={`
                      rounded-lg border p-4 transition-all
                      ${isToday ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
                      ${isWeekend && !isToday ? 'bg-muted/30' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm
                          ${isToday 
                            ? "bg-primary text-primary-foreground" 
                            : isWeekend 
                              ? "bg-muted text-muted-foreground" 
                              : "bg-muted/80 text-foreground"
                          }
                        `}>
                          {t(`dayOfWeek.${day}`).slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{t(`dayOfWeek.${day}`)}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeSlots.length > 0 
                              ? `${activeSlots.length} ${activeSlots.length === 1 ? 'slot' : 'slots'} • ${totalHours.toFixed(1)}h`
                              : t("noAvailability") || "Not available"
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {slots.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyDay(day)}
                            className="text-muted-foreground"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            {t("copy")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditScheduleDialogOpen(false);
                            handleAddSlotToDay(day);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t("addSlot") || "Add"}
                        </Button>
                      </div>
                    </div>
                    
                    {slots.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                        {t("noSlotsForDay") || "No time slots configured"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`
                              flex items-center justify-between gap-3 p-3 rounded-lg border
                              ${slot.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                p-2 rounded-lg
                                ${slot.isActive ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-muted'}
                              `}>
                                <Clock className={`h-4 w-4 ${slot.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <p className="font-mono font-medium">
                                  {slot.startTime} – {slot.endTime}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {slot.serviceOption?.title || t("allServices")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Switch
                                        checked={slot.isActive}
                                        onCheckedChange={() => handleToggleActive(slot)}
                                        className="data-[state=checked]:bg-emerald-500"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {slot.isActive ? t("disable") : t("enable")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditScheduleDialogOpen(false);
                                  handleEditSlot(slot);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditScheduleDialogOpen(false)}>
              {tCommon("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Time Dialog */}
      <Dialog open={blockTimeDialogOpen} onOpenChange={(open) => {
        setBlockTimeDialogOpen(open);
        if (!open) {
          resetBlockForm();
          setBlockTimeTab("add");
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <CalendarOff className="h-5 w-5" />
              {tBlocks("title") || "Block Time"}
            </DialogTitle>
            <DialogDescription>
              {tBlocks("description") || "Block specific dates and times when you're not available for appointments."}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={blockTimeTab} onValueChange={(v) => setBlockTimeTab(v as "add" | "manage")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="add" className="gap-2">
                <Plus className="h-4 w-4" />
                {editingBlockTime ? (tCommon("edit") || "Edit") : (tBlocks("addBlock") || "Add Block")}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <List className="h-4 w-4" />
                {tBlocks("manageBlocks") || "Manage Blocks"}
                {blockedTimes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {blockedTimes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Add/Edit Tab */}
            <TabsContent value="add" className="flex-1 overflow-y-auto mt-0 space-y-6 pr-1">
              {editingBlockTime && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {tBlocks("editingBlock") || "Editing blocked time"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetBlockForm}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              )}

              {/* Quick date selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{tBlocks("date") || "Select Date"}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const dateObj = addDays(new Date(), i);
                    const dateStr = format(dateObj, "yyyy-MM-dd");
                    const isSelected = blockFormData.date === dateStr;
                    const dayName = format(dateObj, "EEE");
                    const dayNum = format(dateObj, "d");
                    const isToday = i === 0;
                    
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setBlockFormData({ ...blockFormData, date: dateStr })}
                        className={`
                          flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                          ${isSelected 
                            ? "bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-sm" 
                            : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                          }
                        `}
                      >
                        <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {isToday ? (tCommon("today") || "Today") : dayName}
                        </span>
                        <span className={`text-lg font-bold ${isSelected ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Custom date input */}
                <div className="flex items-center gap-2 pt-2">
                  <Label className="text-sm text-muted-foreground shrink-0">{tBlocks("orSelectDate") || "Or select:"}</Label>
                  <Input
                    type="date"
                    value={blockFormData.date}
                    onChange={(e) => setBlockFormData({ ...blockFormData, date: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <Separator />

              {/* Full day toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                    <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">{tBlocks("fullDay") || "Block Entire Day"}</p>
                    <p className="text-xs text-muted-foreground">{tBlocks("fullDayDesc") || "No appointments will be available"}</p>
                  </div>
                </div>
                <Switch
                  checked={blockFormData.isFullDay}
                  onCheckedChange={(checked) => setBlockFormData({ ...blockFormData, isFullDay: checked })}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {/* Time range selector - only show if not full day */}
              {!blockFormData.isFullDay && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">{tBlocks("timeRange") || "Time Range to Block"}</Label>
                  <BlockTimeRangePicker
                    startTime={blockFormData.startTime}
                    endTime={blockFormData.endTime}
                    onTimeChange={(start, end) => setBlockFormData({ ...blockFormData, startTime: start, endTime: end })}
                  />
                </div>
              )}

              <Separator />

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{tBlocks("reason") || "Reason (Optional)"}</Label>
                <Textarea
                  placeholder={tBlocks("reasonPlaceholder") || "e.g., Vacation, Meeting, Personal time..."}
                  value={blockFormData.reason}
                  onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Action button at bottom of add tab */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleCreateBlockTime}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {editingBlockTime 
                    ? (tBlocks("updateBlock") || "Update Block") 
                    : (tBlocks("blockTime") || "Block Time")
                  }
                </Button>
              </div>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="flex-1 overflow-y-auto mt-0 pr-1">
              {blockedTimes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <CalendarOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{tBlocks("empty.title") || "No blocked times"}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tBlocks("empty.description") || "You haven't blocked any times yet."}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setBlockTimeTab("add")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {tBlocks("addFirst") || "Add your first block"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upcoming Blocked Times */}
                  {groupedBlockedTimes.upcoming.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{tBlocks("upcomingBlocked") || "Upcoming"}</h3>
                        <Badge variant="secondary" className="text-xs">{groupedBlockedTimes.upcoming.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedBlockedTimes.upcoming.map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 shrink-0">
                                <CalendarX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {format(parseISO(bt.date), "EEEE, MMMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bt.isFullDay 
                                    ? (tBlocks("allDay") || "All day") 
                                    : `${bt.startTime} – ${bt.endTime}`
                                  }
                                  {bt.reason && ` • ${bt.reason}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleEditBlockTime(bt)}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{tCommon("edit")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteBlockTime(bt.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{tCommon("delete")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Blocked Times */}
                  {groupedBlockedTimes.past.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-muted-foreground">{tBlocks("pastBlocked") || "Past"}</h3>
                        <Badge variant="outline" className="text-xs">{groupedBlockedTimes.past.length}</Badge>
                      </div>
                      <div className="space-y-2 opacity-60">
                        {groupedBlockedTimes.past.slice(0, 10).map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-muted shrink-0">
                                <CalendarX className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {format(parseISO(bt.date), "EEEE, MMMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bt.isFullDay 
                                    ? (tBlocks("allDay") || "All day") 
                                    : `${bt.startTime} – ${bt.endTime}`
                                  }
                                  {bt.reason && ` • ${bt.reason}`}
                                </p>
                              </div>
                            </div>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteBlockTime(bt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{tCommon("delete")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))}
                        {groupedBlockedTimes.past.length > 10 && (
                          <p className="text-xs text-center text-muted-foreground pt-2">
                            +{groupedBlockedTimes.past.length - 10} {tBlocks("moreBlocks") || "more"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setBlockTimeDialogOpen(false)}>
              {tCommon("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
