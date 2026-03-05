"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import {
  organizationsApi,
  organizationSettingsApi,
  serviceOptionsApi,
  userServiceOptionsApi,
  availabilityApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import { OrganizationSettings, ServiceOption, Availability, DayOfWeek } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageCropUpload } from "@/components/ui/image-crop-upload";
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
import { WhatsAppChannelSettings, SmsChannelSettings } from "@/components/notification-settings";
import {
  Settings,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  Pencil,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  MessageSquare,
} from "lucide-react";

// Step types
type OnboardingStep = "settings" | "services" | "availability" | "notifications" | "complete";

const STEPS: OnboardingStep[] = ["settings", "services", "availability", "notifications", "complete"];

// Visual Time Range Picker Component (matching availability page)
function VisualTimeRangePicker({
  startTime,
  endTime,
  onTimeChange,
}: {
  startTime: string;
  endTime: string;
  onTimeChange: (start: string, end: string) => void;
}) {
  const t = useTranslations("availability");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStart, setInitialStart] = useState(0);
  const [initialEnd, setInitialEnd] = useState(0);

  const startHour = 0;
  const endHour = 24;
  const totalHours = endHour - startHour;
  const snapMinutes = 5;

  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return (h - startHour) * 60 + m;
  };

  const minutesToTime = (minutes: number): string => {
    const totalMinutes = Math.max(0, Math.min(minutes, 23 * 60 + 59));
    const h = Math.floor(totalMinutes / 60) + startHour;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const snapToInterval = (minutes: number): number => {
    return Math.round(minutes / snapMinutes) * snapMinutes;
  };

  const getPositionPercent = (minutes: number): number => {
    return (minutes / (totalHours * 60)) * 100;
  };

  const getMinutesFromPosition = (clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(x / rect.width, 1));
    return snapToInterval(percent * totalHours * 60);
  };

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setIsDragging(type);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setInitialStart(startMinutes);
    setInitialEnd(endMinutes);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = clientX - dragStartX;
    const deltaMinutes = snapToInterval((deltaX / rect.width) * totalHours * 60);
    
    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(initialStart + deltaMinutes, initialEnd - snapMinutes));
      onTimeChange(minutesToTime(newStart), endTime);
    } else if (isDragging === 'end') {
      const newEnd = Math.max(initialStart + snapMinutes, Math.min(initialEnd + deltaMinutes, totalHours * 60));
      onTimeChange(startTime, minutesToTime(newEnd));
    } else if (isDragging === 'range') {
      const duration = initialEnd - initialStart;
      let newStart = initialStart + deltaMinutes;
      let newEnd = initialEnd + deltaMinutes;
      
      if (newStart < 0) {
        newStart = 0;
        newEnd = duration;
      }
      if (newEnd > totalHours * 60) {
        newEnd = totalHours * 60;
        newStart = newEnd - duration;
      }
      onTimeChange(minutesToTime(newStart), minutesToTime(newEnd));
    }
  }, [isDragging, dragStartX, initialStart, initialEnd, startTime, endTime, totalHours, snapMinutes, onTimeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const minutes = getMinutesFromPosition(e.clientX);
    const duration = endMinutes - startMinutes;
    const halfDuration = duration / 2;
    
    let newStart = snapToInterval(minutes - halfDuration);
    let newEnd = snapToInterval(minutes + halfDuration);
    
    if (newStart < 0) {
      newStart = 0;
      newEnd = duration;
    }
    if (newEnd > totalHours * 60) {
      newEnd = totalHours * 60;
      newStart = newEnd - duration;
    }
    
    onTimeChange(minutesToTime(newStart), minutesToTime(newEnd));
  };

  const durationMinutes = endMinutes - startMinutes;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = durationMinutes % 60;

  const presets = [
    { label: t("presets.morning") || "Morning", icon: Sunrise, start: "06:00", end: "12:00", color: "text-amber-500" },
    { label: t("presets.afternoon") || "Afternoon", icon: Sun, start: "12:00", end: "18:00", color: "text-sky-500" },
    { label: t("presets.evening") || "Evening", icon: Sunset, start: "18:00", end: "23:00", color: "text-indigo-500" },
    { label: t("presets.fullDay") || "Full Day", icon: Clock, start: "00:00", end: "23:59", color: "text-emerald-500" },
  ];

  const leftPercent = getPositionPercent(startMinutes);
  const widthPercent = getPositionPercent(endMinutes - startMinutes);

  return (
    <div className="space-y-5">
      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isActive = startTime === preset.start && endTime === preset.end;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onTimeChange(preset.start, preset.end)}
              className={`
                flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                ${isActive 
                  ? "bg-primary/10 border-primary shadow-sm" 
                  : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                }
              `}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-background'}`}>
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : preset.color}`} />
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {preset.label}
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                {preset.start.slice(0, 5)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Timeline */}
      <div className="space-y-3 p-4 rounded-xl border bg-card">
        {/* Header with time display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("dialog.dragToSelect") || "Drag to select time"}</p>
              <p className="text-xs text-muted-foreground">Click or drag to adjust</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-background">
              {startTime} – {endTime}
            </Badge>
            <Badge className="font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
              {durationHours > 0 && `${durationHours}h `}{durationMins > 0 && `${durationMins}m`}
              {durationHours === 0 && durationMins === 0 && "0m"}
            </Badge>
          </div>
        </div>

        {/* Time header labels */}
        <div className="flex items-center text-[10px] font-medium text-muted-foreground px-1">
          <div className="flex-1 flex justify-between">
            <span className="tabular-nums">00:00</span>
            <span className="tabular-nums">06:00</span>
            <span className="tabular-nums">12:00</span>
            <span className="tabular-nums">18:00</span>
            <span className="tabular-nums">24:00</span>
          </div>
        </div>
        
        {/* Timeline Bar */}
        <div 
          ref={containerRef}
          className="relative h-14 bg-gradient-to-r from-muted/60 to-muted/40 rounded-lg cursor-pointer select-none overflow-hidden border border-border/40"
          onClick={handleTimelineClick}
        >
          {/* Background grid pattern - 24 hours */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour} 
                className={`flex-1 border-r ${
                  hour % 6 === 5 
                    ? 'border-border/40' 
                    : 'border-border/10'
                } last:border-r-0`} 
              />
            ))}
          </div>

          {/* Time period backgrounds */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="w-1/4 bg-slate-900/5 dark:bg-slate-100/5" />
            <div className="w-1/4 bg-amber-500/5" />
            <div className="w-1/4 bg-sky-500/5" />
            <div className="w-1/4 bg-indigo-500/5" />
          </div>

          {/* Selected Range */}
          <div
            className={`absolute top-2 bottom-2 rounded-md cursor-grab transition-all duration-100 shadow-md hover:shadow-lg ${isDragging === 'range' ? 'cursor-grabbing scale-y-105' : ''}`}
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, 2)}%`,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'range')}
            onTouchStart={(e) => handleMouseDown(e, 'range')}
          >
            <div className="absolute inset-0 rounded-md bg-gradient-to-b from-white/25 to-transparent" />
            {widthPercent > 15 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-sm">
                  {startTime} – {endTime}
                </span>
              </div>
            )}
          </div>

          {/* Start Handle */}
          <div
            className={`absolute top-1 bottom-1 w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize z-10 group ${isDragging === 'start' ? 'cursor-grabbing' : ''}`}
            style={{ left: `${leftPercent}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            onTouchStart={(e) => handleMouseDown(e, 'start')}
          >
            <div className="w-1.5 h-10 bg-white rounded-full shadow-lg border-2 border-emerald-500 group-hover:scale-110 group-hover:border-emerald-400 transition-all" />
          </div>

          {/* End Handle */}
          <div
            className={`absolute top-1 bottom-1 w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize z-10 group ${isDragging === 'end' ? 'cursor-grabbing' : ''}`}
            style={{ left: `${leftPercent + widthPercent}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            onTouchStart={(e) => handleMouseDown(e, 'end')}
          >
            <div className="w-1.5 h-10 bg-white rounded-full shadow-lg border-2 border-emerald-500 group-hover:scale-110 group-hover:border-emerald-400 transition-all" />
          </div>
        </div>

        {/* Time period legend */}
        <div className="flex items-center justify-center gap-6 pt-1 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Moon className="h-3 w-3" />
            <span>Night</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunrise className="h-3 w-3 text-amber-500" />
            <span>Morning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sun className="h-3 w-3 text-sky-500" />
            <span>Afternoon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset className="h-3 w-3 text-indigo-500" />
            <span>Evening</span>
          </div>
        </div>
      </div>

      {/* Manual Time Input */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime" className="text-xs font-medium">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => {
              const newStart = e.target.value;
              const newStartMins = timeToMinutes(newStart);
              if (newStartMins < timeToMinutes(endTime)) {
                onTimeChange(newStart, endTime);
              }
            }}
            className="h-10 font-mono text-center"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className="text-xs font-medium">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => {
              const newEnd = e.target.value;
              const newEndMins = timeToMinutes(newEnd);
              if (newEndMins > timeToMinutes(startTime)) {
                onTimeChange(startTime, newEnd);
              }
            }}
            className="h-10 font-mono text-center"
          />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currentOrganization, isAdmin, isLoading: orgLoading } = useOrganizationContext();
  const t = useTranslations("onboarding");
  const tOptions = useTranslations("optionsPage");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Settings state
  const [settings, setSettings] = useState<Partial<OrganizationSettings>>({
    timezone: "UTC",
    providerSelectionMode: "auto_assign",
    bufferTimeMinutes: 15,
    minAdvanceBookingHours: 24,
    maxAdvanceBookingDays: 30,
  });

  // Services state
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceOption | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    title: "",
    description: "",
    imageBase64: "" as string | undefined,
    duration: 30,
  });

  // Availability state
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4]);
  const [workingHours, setWorkingHours] = useState({ startTime: "09:00", endTime: "17:00" });

  // Completion state
  const [bookingLink, setBookingLink] = useState<{ slug: string } | null>(null);

  const currentStepIndex = STEPS.indexOf(currentStep);

  // Day names
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Check if org is already onboarded
  const checkOnboardingStatus = useCallback(async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const response = await organizationsApi.getOnboardingStatus(currentOrganization.id);
      if (response.data.onboarded) {
        // Already onboarded, redirect to dashboard
        router.replace("/dashboard");
        return;
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setCheckingOnboarding(false);
    }
  }, [currentOrganization, getToken, router]);

  // Fetch existing data
  const fetchExistingData = useCallback(async () => {
    if (!currentOrganization) return;

    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const [settingsRes, servicesRes] = await Promise.all([
        organizationSettingsApi.get(),
        serviceOptionsApi.getAllForOrganization(),
      ]);

      if (settingsRes.data) {
        setSettings({
          timezone: settingsRes.data.timezone || "UTC",
          providerSelectionMode: settingsRes.data.providerSelectionMode || "auto_assign",
          bufferTimeMinutes: settingsRes.data.bufferTimeMinutes || 15,
          minAdvanceBookingHours: settingsRes.data.minAdvanceBookingHours || 24,
          maxAdvanceBookingDays: settingsRes.data.maxAdvanceBookingDays || 30,
        });
      }

      setServices(servicesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch existing data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getToken]);

  useEffect(() => {
    if (!isLoaded || orgLoading) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    if (!currentOrganization) {
      // No organization selected, wait for org selection
      setCheckingOnboarding(false);
      setLoading(false);
      return;
    }

    if (!isAdmin) {
      // Non-admin trying to access onboarding, redirect to dashboard
      router.replace("/dashboard");
      return;
    }

    checkOnboardingStatus();
  }, [isLoaded, isSignedIn, currentOrganization, isAdmin, orgLoading, router, checkOnboardingStatus]);

  useEffect(() => {
    if (!checkingOnboarding && currentOrganization && isAdmin) {
      fetchExistingData();
    }
  }, [checkingOnboarding, currentOrganization, isAdmin, fetchExistingData]);

  // Save settings
  const saveSettings = async () => {
    if (!currentOrganization) return false;

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      await organizationSettingsApi.update(settings);
      return true;
    } catch (error) {
      toast({
        title: t("errors.saveFailed"),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Open service dialog for adding
  const openAddServiceDialog = () => {
    setEditingService(null);
    setServiceFormData({ title: "", description: "", imageBase64: undefined, duration: 30 });
    setServiceDialogOpen(true);
  };

  // Open service dialog for editing
  const openEditServiceDialog = (service: ServiceOption) => {
    setEditingService(service);
    setServiceFormData({
      title: service.title,
      description: service.description || "",
      imageBase64: service.imageBase64 || undefined,
      duration: service.duration,
    });
    setServiceDialogOpen(true);
  };

  // Save service (create or update) and auto-assign current user
  const saveService = async () => {
    if (!currentOrganization || !serviceFormData.title.trim()) return;

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      if (editingService) {
        // Update existing service
        await serviceOptionsApi.updateInOrganization(editingService.id, serviceFormData);
        setServices(services.map(s => 
          s.id === editingService.id 
            ? { ...s, ...serviceFormData } 
            : s
        ));
        toast({ title: tOptions("messages.updated") });
      } else {
        // Create new service
        const response = await serviceOptionsApi.createForOrganization({
          title: serviceFormData.title,
          description: serviceFormData.description || undefined,
          imageBase64: serviceFormData.imageBase64 || undefined,
          duration: serviceFormData.duration,
        });

        const newServiceId = response.data.id;

        // Auto-assign current user as provider for this service
        if (userId) {
          try {
            await userServiceOptionsApi.assignService({
              serviceOptionId: newServiceId,
              isActive: true,
            });
          } catch (assignError) {
            console.error("Failed to auto-assign service to user:", assignError);
            // Don't fail the whole operation if assignment fails
          }
        }

        setServices([...services, response.data]);
        toast({ title: tOptions("messages.created") });
      }

      setServiceDialogOpen(false);
    } catch (error) {
      toast({
        title: t("errors.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete service
  const deleteService = async (id: string) => {
    if (!currentOrganization) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      await serviceOptionsApi.deleteFromOrganization(id);
      setServices(services.filter((s) => s.id !== id));
      toast({ title: tOptions("messages.deleted") });
    } catch (error) {
      toast({
        title: t("errors.saveFailed"),
        variant: "destructive",
      });
    }
  };

  // Save availability
  const saveAvailability = async () => {
    if (!currentOrganization) return false;

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      // Delete existing availabilities first
      await availabilityApi.deleteAll();

      // Create new availabilities based on selected days and hours
      const newSlots = selectedDays.map((day) => ({
        dayOfWeek: day,
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
      }));

      if (newSlots.length > 0) {
        await availabilityApi.createBulk({ availabilities: newSlots });
      }

      return true;
    } catch (error) {
      toast({
        title: t("errors.saveFailed"),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!currentOrganization) return;

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const response = await organizationsApi.completeOnboarding(currentOrganization.id);

      if (response.data.bookingLink) {
        setBookingLink(response.data.bookingLink);
      }

      setCurrentStep("complete");
    } catch (error) {
      toast({
        title: t("errors.completeOnboardingFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle next step
  const handleNext = async () => {
    if (currentStep === "settings") {
      const success = await saveSettings();
      if (success) {
        setCurrentStep("services");
      }
    } else if (currentStep === "services") {
      setCurrentStep("availability");
    } else if (currentStep === "availability") {
      const success = await saveAvailability();
      if (success) {
        setCurrentStep("notifications");
      }
    } else if (currentStep === "notifications") {
      await completeOnboarding();
    }
  };

  // Handle back
  const handleBack = () => {
    if (currentStep === "services") {
      setCurrentStep("settings");
    } else if (currentStep === "availability") {
      setCurrentStep("services");
    } else if (currentStep === "notifications") {
      setCurrentStep("availability");
    }
  };

  // Toggle day
  const toggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  // Copy booking link
  const copyBookingLink = () => {
    if (bookingLink) {
      const url = `${window.location.origin}/book/${bookingLink.slug}`;
      navigator.clipboard.writeText(url);
      toast({
        title: t("completion.linkCopied"),
      });
    }
  };

  if (loading || checkingOnboarding || orgLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select or create an organization to continue.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        {currentStep !== "complete" && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              {t("progress.step", { current: currentStepIndex + 1, total: STEPS.length - 1 })}
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        )}

        {/* Progress Steps */}
        {currentStep !== "complete" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.slice(0, -1).map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${index < currentStepIndex
                      ? "bg-primary border-primary text-primary-foreground"
                      : index === currentStepIndex
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                    }
                  `}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < STEPS.length - 2 && (
                  <div
                    className={`w-12 h-0.5 mx-1 transition-colors ${
                      index < currentStepIndex ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step Content */}
        <Card className="shadow-lg">
          {/* Settings Step */}
          {currentStep === "settings" && (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t("settingsStep.title")}</CardTitle>
                    <CardDescription>{t("settingsStep.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Timezone */}
                <div className="space-y-2">
                  <Label>{t("settingsStep.timezone")}</Label>
                  <Select
                    value={settings.timezone || "UTC"}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem>
                      <SelectItem value="Europe/Istanbul">Europe/Istanbul (TRT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("settingsStep.timezoneHint")}</p>
                </div>

                {/* Provider Mode */}
                <div className="space-y-3">
                  <Label>{t("settingsStep.providerMode")}</Label>
                  <RadioGroup
                    value={settings.providerSelectionMode || "auto_assign"}
                    onValueChange={(value) =>
                      setSettings({ ...settings, providerSelectionMode: value as "auto_assign" | "client_chooses" })
                    }
                    className="grid gap-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="auto_assign" id="auto_assign" className="mt-1" />
                      <Label htmlFor="auto_assign" className="cursor-pointer font-normal">
                        {t("settingsStep.autoAssign")}
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="client_chooses" id="client_chooses" className="mt-1" />
                      <Label htmlFor="client_chooses" className="cursor-pointer font-normal">
                        {t("settingsStep.clientChooses")}
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">{t("settingsStep.providerModeHint")}</p>
                </div>

                {/* Buffer Time */}
                <div className="space-y-2">
                  <Label>{t("settingsStep.bufferTime")}</Label>
                  <NumberInput
                    min={0}
                    max={120}
                    value={settings.bufferTimeMinutes || 15}
                    defaultValue={15}
                    onChange={(value) => setSettings({ ...settings, bufferTimeMinutes: value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("settingsStep.bufferTimeHint")}</p>
                </div>

                {/* Booking Window */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("settingsStep.minAdvance")}</Label>
                    <NumberInput
                      min={0}
                      max={168}
                      value={settings.minAdvanceBookingHours || 24}
                      defaultValue={24}
                      onChange={(value) => setSettings({ ...settings, minAdvanceBookingHours: value })}
                    />
                    <p className="text-xs text-muted-foreground">{t("settingsStep.minAdvanceHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settingsStep.maxAdvance")}</Label>
                    <NumberInput
                      min={1}
                      max={365}
                      value={settings.maxAdvanceBookingDays || 30}
                      defaultValue={30}
                      onChange={(value) => setSettings({ ...settings, maxAdvanceBookingDays: value })}
                    />
                    <p className="text-xs text-muted-foreground">{t("settingsStep.maxAdvanceHint")}</p>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Services Step - Using Service Options Page UI */}
          {currentStep === "services" && (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t("servicesStep.title")}</CardTitle>
                      <CardDescription>{t("servicesStep.description")}</CardDescription>
                    </div>
                  </div>
                  <Button onClick={openAddServiceDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("servicesStep.addService")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Existing Services Grid - matching service options page */}
                {services.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <Card 
                        key={service.id} 
                        className="group cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openEditServiceDialog(service)}
                      >
                        <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                          {service.imageBase64 ? (
                            <img
                              src={service.imageBase64}
                              alt={service.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold line-clamp-1">{service.title}</h3>
                            <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditServiceDialog(service)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteService(service.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
                            {service.description || tCommon("noDescription")}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {service.duration} {tCommon("minutes")}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">{t("servicesStep.noServices")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("servicesStep.noServicesHint")}
                    </p>
                    <Button onClick={openAddServiceDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("servicesStep.addService")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Availability Step - Using Availability Page UI */}
          {currentStep === "availability" && (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t("availabilityStep.title")}</CardTitle>
                    <CardDescription>{t("availabilityStep.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Day Selection */}
                <div className="space-y-3">
                  <Label>{t("availabilityStep.selectDays")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => {
                      const isSelected = selectedDays.includes(index as DayOfWeek);
                      const isWeekend = index === 5 || index === 6;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(index as DayOfWeek)}
                          className={`
                            w-14 h-14 rounded-lg border font-medium transition-all flex flex-col items-center justify-center
                            ${isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : isWeekend
                              ? "border-border/50 text-muted-foreground hover:border-primary/50"
                              : "border-border hover:border-primary/50"
                            }
                          `}
                        >
                          <span className="text-sm">{day}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Range - Using Visual Time Picker */}
                <div className="space-y-3">
                  <Label>{t("availabilityStep.timeRange")}</Label>
                  <VisualTimeRangePicker
                    startTime={workingHours.startTime}
                    endTime={workingHours.endTime}
                    onTimeChange={(start, end) => setWorkingHours({ startTime: start, endTime: end })}
                  />
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDays.length > 0 ? (
                      <>
                        Working {selectedDays.map((d) => dayNames[d]).join(", ")} from{" "}
                        {workingHours.startTime} to {workingHours.endTime}
                      </>
                    ) : (
                      t("availabilityStep.noAvailabilityHint")
                    )}
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Notifications Step - WhatsApp/Meta Connection */}
          {currentStep === "notifications" && (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-950">
                    <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>{t("notificationsStep.title")}</CardTitle>
                    <CardDescription>{t("notificationsStep.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("notificationsStep.whatsappHint")}
                  </p>
                  <WhatsAppChannelSettings />
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("notificationsStep.smsHint")}
                  </p>
                  <SmsChannelSettings />
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">{t("notificationsStep.optionalTitle")}</p>
                      <p className="mt-1">{t("notificationsStep.optionalHint")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Completion Step */}
          {currentStep === "complete" && (
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("completion.title")}</h2>
              <p className="text-muted-foreground mb-8">{t("completion.description")}</p>

              {bookingLink && (
                <div className="max-w-md mx-auto mb-8">
                  <Label className="text-sm font-medium">{t("completion.bookingLinkLabel")}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 p-3 rounded-lg bg-muted border font-mono text-sm truncate">
                      {window.location.origin}/book/{bookingLink.slug}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyBookingLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`/book/${bookingLink.slug}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t("completion.bookingLinkHint")}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {bookingLink && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/book/${bookingLink.slug}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("completion.viewBookingPage")}
                  </Button>
                )}
                <Button onClick={() => router.push("/dashboard")}>
                  {t("completion.goToDashboard")}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          )}

          {/* Navigation */}
          {currentStep !== "complete" && (
            <div className="flex items-center justify-between p-6 border-t bg-muted/30">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === "settings" || saving}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t("navigation.back")}
              </Button>
              <Button
                onClick={handleNext}
                disabled={saving || (currentStep === "services" && services.length === 0) || (currentStep === "availability" && selectedDays.length === 0)}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {currentStep === "notifications" ? t("navigation.finish") : t("navigation.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Service Create/Edit Dialog - Matching Service Options Page */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? tOptions("dialog.editTitle") : tOptions("dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{tOptions("dialog.title")}</Label>
              <Input
                id="title"
                value={serviceFormData.title}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, title: e.target.value })
                }
                placeholder={tOptions("dialog.titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{tOptions("dialog.description")}</Label>
              <Textarea
                id="description"
                value={serviceFormData.description}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, description: e.target.value })
                }
                placeholder={tOptions("dialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{tOptions("dialog.image")}</Label>
              <ImageCropUpload
                value={serviceFormData.imageBase64}
                onChange={(base64) =>
                  setServiceFormData({ ...serviceFormData, imageBase64: base64 })
                }
                aspectRatio={16 / 9}
                placeholder={tOptions("dialog.imagePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{tOptions("dialog.duration")}</Label>
              <NumberInput
                min={5}
                max={480}
                value={serviceFormData.duration}
                defaultValue={30}
                onChange={(value) =>
                  setServiceFormData({ ...serviceFormData, duration: value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={saveService} disabled={!serviceFormData.title || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                editingService ? tCommon("update") : tCommon("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
