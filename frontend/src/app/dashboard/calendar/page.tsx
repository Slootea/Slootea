"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  appointmentsApi,
  serviceOptionsApi,
  availabilityApi,
  blockedTimesApi,
  organizationSettingsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  Appointment,
  AppointmentStatus,
  ServiceOption,
  Availability,
  BlockedTime,
  DayOfWeek,
} from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  setHours,
} from "date-fns";
import { useOrganizationContext } from "@/components/providers/organization-provider";

// Import components
import {
  CalendarEvent,
  DragState,
  PendingChange,
  TimeSlot,
  HOUR_HEIGHT,
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
} from "@/components/calendar/types";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { TimeColumn } from "@/components/calendar/TimeColumn";
import { DayColumn } from "@/components/calendar/DayColumn";
import { EditAppointmentDialog } from "@/components/calendar/EditAppointmentDialog";
import { MoveConfirmationDialog } from "@/components/calendar/MoveConfirmationDialog";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";
import { CreateAppointmentDialog } from "@/components/calendar/CreateAppointmentDialog";

export default function CalendarPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const t = useTranslations("calendarPage.messages");
  const { currentOrganization, isAdmin, members } = useOrganizationContext();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [organizationTimezone, setOrganizationTimezone] = useState<string>("UTC");
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day">("week");

  // Member filter state (for organization admins)
  const [selectedMember, setSelectedMember] = useState<string>("all");

  // Edit appointment state
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState("");
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);

  // Create appointment state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(new Date());
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>("09:00");
  const [createSaving, setCreateSaving] = useState(false);
  const [createFromButton, setCreateFromButton] = useState(false);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    hasMoved: false,
    appointmentId: null,
    originalTop: 0,
    currentTop: 0,
    originalDay: null,
    currentDay: null,
    offsetY: 0,
  });
  const dragMovedRef = useRef(false);
  const justFinishedDragRef = useRef(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const dayColumnsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  // Get days for the week view
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  // Generate time slots for the sidebar
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      slots.push({
        hour,
        label: format(setHours(new Date(), hour), "h a"),
      });
    }
    return slots;
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      return;
    }
    setAuthToken(token);
    if (currentOrganization) {
      setOrganizationContext(currentOrganization.id);
    } else {
      setOrganizationContext(null);
    }

    try {
      const startDate = format(viewMode === "week" ? weekStart : currentDate, "yyyy-MM-dd");
      const endDate = format(viewMode === "week" ? weekEnd : currentDate, "yyyy-MM-dd");

      const appointmentParams: Record<string, unknown> = {
        startDate,
        endDate,
        limit: 100,
        sortBy: "startTime",
        sortOrder: "ASC",
      };

      if (currentOrganization && isAdmin && selectedMember !== "all") {
        appointmentParams.userId = selectedMember;
      }

      // Determine if we should fetch member-specific availability/blocked times
      const shouldFetchMemberData = currentOrganization && isAdmin && selectedMember !== "all";

      const [appointmentsRes, servicesRes, availabilityRes, blockedRes, orgSettingsRes] = await Promise.all([
        appointmentsApi.getAll(appointmentParams),
        // Admin gets organization services, members get personal services
        currentOrganization && isAdmin
          ? serviceOptionsApi.getAllForOrganization()
          : serviceOptionsApi.getAll(),
        // Fetch availability for selected member or current user
        shouldFetchMemberData
          ? availabilityApi.getForMember(selectedMember)
          : availabilityApi.getAll(),
        // Fetch blocked times for selected member or current user
        shouldFetchMemberData
          ? blockedTimesApi.getForMember(selectedMember, { startDate, endDate })
          : blockedTimesApi.getAll({ startDate, endDate }),
        // Fetch organization settings for timezone
        currentOrganization
          ? organizationSettingsApi.get().catch(() => ({ data: { timezone: 'UTC' } }))
          : Promise.resolve({ data: { timezone: 'UTC' } }),
      ]);

      setAppointments(appointmentsRes.data.data || appointmentsRes.data);
      setServiceOptions(servicesRes.data);
      setAvailabilities(availabilityRes.data);
      setBlockedTimes(blockedRes.data);
      setOrganizationTimezone(orgSettingsRes.data?.timezone || 'UTC');
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: t("error"),
        description: t("failedToLoadCalendar"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken, weekStart, weekEnd, currentDate, viewMode, toast, currentOrganization, isAdmin, selectedMember, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => {
    setCurrentDate((date) =>
      viewMode === "week" ? subWeeks(date, 1) : addDays(date, -1)
    );
  };
  const goToNext = () => {
    setCurrentDate((date) =>
      viewMode === "week" ? addWeeks(date, 1) : addDays(date, 1)
    );
  };

  // Calculate event positions for a specific day
  const getEventsForDay = useCallback(
    (day: Date): CalendarEvent[] => {
      const dayAppointments = appointments.filter((apt) =>
        isSameDay(parseISO(apt.startTime), day)
      );

      dayAppointments.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const events: CalendarEvent[] = [];
      const columns: Appointment[][] = [];

      for (const apt of dayAppointments) {
        const aptStart = parseISO(apt.startTime);

        // Calculate position based on local time hours
        const startHour = aptStart.getHours() + aptStart.getMinutes() / 60;
        const top = (startHour - START_HOUR) * HOUR_HEIGHT;
        
        // Calculate height based on service duration (not stored endTime)
        // This ensures consistent display regardless of stored endTime
        const durationMinutes = apt.serviceOption?.duration || 60;
        const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

        let columnIndex = 0;
        for (let i = 0; i < columns.length; i++) {
          const lastInColumn = columns[i][columns[i].length - 1];
          // Calculate end time from service duration instead of stored endTime
          const lastDuration = lastInColumn.serviceOption?.duration || 60;
          const lastEndTime = new Date(new Date(lastInColumn.startTime).getTime() + lastDuration * 60000);
          if (lastEndTime <= aptStart) {
            columnIndex = i;
            break;
          }
          columnIndex = i + 1;
        }

        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }
        columns[columnIndex].push(apt);

        events.push({
          appointment: apt,
          top,
          height,
          left: 0,
          width: 100,
          overlappingIndex: columnIndex,
          overlappingCount: 1,
        });
      }

      const totalColumns = columns.length || 1;
      return events.map((event) => ({
        ...event,
        left: (event.overlappingIndex / totalColumns) * 100,
        width: 100 / totalColumns,
        overlappingCount: totalColumns,
      }));
    },
    [appointments]
  );

  // Get availability ranges for a day
  const getAvailabilityForDay = useCallback(
    (day: Date) => {
      const dayOfWeek = ((day.getDay() + 6) % 7) as DayOfWeek;
      return availabilities.filter((av) => av.dayOfWeek === dayOfWeek && av.isActive);
    },
    [availabilities]
  );

  // Check if a time slot is blocked
  const getBlockedTimesForDay = useCallback(
    (day: Date) => {
      return blockedTimes.filter((bt) => isSameDay(parseISO(bt.date), day));
    },
    [blockedTimes]
  );

  // Find appointment by ID
  const findAppointmentById = useCallback(
    (id: string) => appointments.find((apt) => apt.id === id),
    [appointments]
  );

  // Calculate time from Y position
  const calculateTimeFromPosition = useCallback((y: number, day: Date): Date => {
    const hours = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
    const minutes = Math.round(((y % HOUR_HEIGHT) / HOUR_HEIGHT) * 60 / 15) * 15;
    const newTime = new Date(day);
    newTime.setHours(hours, minutes, 0, 0);
    return newTime;
  }, []);

  // Check for overlapping appointments
  const findOverlappingAppointment = useCallback(
    (newStart: Date, newEnd: Date, excludeId: string, day: Date): Appointment | null => {
      const dayAppointments = appointments.filter(
        (apt) =>
          apt.id !== excludeId &&
          isSameDay(parseISO(apt.startTime), day) &&
          apt.status !== AppointmentStatus.CANCELLED &&
          apt.status !== AppointmentStatus.COMPLETED
      );

      for (const apt of dayAppointments) {
        const aptStart = parseISO(apt.startTime);
        // Calculate end time from service duration instead of stored endTime
        const durationMinutes = apt.serviceOption?.duration || 60;
        const aptEnd = new Date(aptStart.getTime() + durationMinutes * 60000);

        if (newStart < aptEnd && newEnd > aptStart) {
          return apt;
        }
      }

      return null;
    },
    [appointments]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, appointment: Appointment, day: Date) => {
      if (
        appointment.status === AppointmentStatus.CANCELLED ||
        appointment.status === AppointmentStatus.COMPLETED
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetY = clientY - rect.top;

      const aptStart = parseISO(appointment.startTime);
      const startHour = aptStart.getHours() + aptStart.getMinutes() / 60;
      const top = (startHour - START_HOUR) * HOUR_HEIGHT;

      dragMovedRef.current = false;

      setDragState({
        isDragging: true,
        hasMoved: false,
        appointmentId: appointment.id,
        originalTop: top,
        currentTop: top,
        originalDay: day,
        currentDay: day,
        offsetY,
      });
    },
    []
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragState.isDragging || !dragState.appointmentId) return;

      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

      let targetDay = dragState.currentDay;
      dayColumnsRef.current.forEach((element, dateStr) => {
        const rect = element.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          targetDay = new Date(dateStr);
        }
      });

      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
        const scrollRect = viewport?.getBoundingClientRect() || scrollArea.getBoundingClientRect();
        const scrollTop = viewport?.scrollTop || 0;

        const relativeY = clientY - scrollRect.top + scrollTop - 48;
        const newTop = Math.max(0, Math.min(relativeY - dragState.offsetY, TOTAL_HOURS * HOUR_HEIGHT - 20));

        const hasMoved =
          Math.abs(newTop - dragState.originalTop) > 5 ||
          (targetDay && dragState.originalDay && !isSameDay(targetDay, dragState.originalDay));

        if (hasMoved) {
          dragMovedRef.current = true;
        }

        setDragState((prev) => ({
          ...prev,
          currentTop: newTop,
          currentDay: targetDay,
          hasMoved: hasMoved || prev.hasMoved,
        }));
      }
    },
    [dragState.isDragging, dragState.appointmentId, dragState.offsetY, dragState.currentDay, dragState.originalTop, dragState.originalDay]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    const wasDragged = dragMovedRef.current;

    // Mark that we just finished a drag operation to prevent click handler
    if (wasDragged) {
      justFinishedDragRef.current = true;
      setTimeout(() => {
        justFinishedDragRef.current = false;
      }, 100);
    }

    if (!dragState.isDragging || !dragState.appointmentId || !dragState.currentDay) {
      dragMovedRef.current = false;
      setDragState({
        isDragging: false,
        hasMoved: false,
        appointmentId: null,
        originalTop: 0,
        currentTop: 0,
        originalDay: null,
        currentDay: null,
        offsetY: 0,
      });
      return;
    }

    if (!wasDragged) {
      dragMovedRef.current = false;
      setDragState({
        isDragging: false,
        hasMoved: false,
        appointmentId: null,
        originalTop: 0,
        currentTop: 0,
        originalDay: null,
        currentDay: null,
        offsetY: 0,
      });
      return;
    }

    const appointment = findAppointmentById(dragState.appointmentId);
    if (!appointment) {
      dragMovedRef.current = false;
      setDragState({
        isDragging: false,
        hasMoved: false,
        appointmentId: null,
        originalTop: 0,
        currentTop: 0,
        originalDay: null,
        currentDay: null,
        offsetY: 0,
      });
      return;
    }

    const duration = appointment.serviceOption?.duration || 60;
    const newStartTime = calculateTimeFromPosition(dragState.currentTop, dragState.currentDay);
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

    const originalStart = parseISO(appointment.startTime);
    if (
      newStartTime.getTime() === originalStart.getTime() &&
      isSameDay(newStartTime, originalStart)
    ) {
      dragMovedRef.current = false;
      setDragState({
        isDragging: false,
        hasMoved: false,
        appointmentId: null,
        originalTop: 0,
        currentTop: 0,
        originalDay: null,
        currentDay: null,
        offsetY: 0,
      });
      return;
    }

    const overlappingApt = findOverlappingAppointment(
      newStartTime,
      newEndTime,
      appointment.id,
      dragState.currentDay
    );

    if (overlappingApt) {
      const overlappingStart = parseISO(overlappingApt.startTime);
      // Calculate end time from service duration
      const overlappingDuration = overlappingApt.serviceOption?.duration || 60;
      const overlappingEnd = new Date(overlappingStart.getTime() + overlappingDuration * 60000);

      setPendingChange({
        type: "swap",
        appointment,
        newStartTime: overlappingStart,
        newEndTime: overlappingEnd,
        swapWith: overlappingApt,
        swapWithNewStartTime: newStartTime,
        swapWithNewEndTime: newEndTime,
      });
    } else {
      setPendingChange({
        type: "move",
        appointment,
        newStartTime,
        newEndTime,
      });
    }

    setSendNotification(true);
    setConfirmDialogOpen(true);

    dragMovedRef.current = false;
    setDragState({
      isDragging: false,
      hasMoved: false,
      appointmentId: null,
      originalTop: 0,
      currentTop: 0,
      originalDay: null,
      currentDay: null,
      offsetY: 0,
    });
  }, [dragState, findAppointmentById, calculateTimeFromPosition, findOverlappingAppointment]);

  // Add event listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchEnd = () => handleDragEnd();

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchend", handleTouchEnd);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // Confirm and save pending change
  const confirmPendingChange = async () => {
    if (!pendingChange) return;

    setSaving(true);
    try {
      if (pendingChange.type === "swap" && pendingChange.swapWith && pendingChange.swapWithNewStartTime) {
        await Promise.all([
          appointmentsApi.update(pendingChange.appointment.id, {
            startTime: pendingChange.newStartTime.toISOString(),
            sendNotification,
          }),
          appointmentsApi.update(pendingChange.swapWith.id, {
            startTime: pendingChange.swapWithNewStartTime.toISOString(),
            sendNotification,
          }),
        ]);

        toast({
          title: t("appointmentsSwapped"),
          description: sendNotification
            ? t("bothNotified")
            : t("swappedSuccess"),
        });
      } else {
        await appointmentsApi.update(pendingChange.appointment.id, {
          startTime: pendingChange.newStartTime.toISOString(),
          sendNotification,
        });

        toast({
          title: t("appointmentMoved"),
          description: sendNotification
            ? t("clientNotified")
            : t("movedSuccess"),
        });
      }

      setConfirmDialogOpen(false);
      setPendingChange(null);
      fetchData();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAppointments"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open edit dialog
  const handleAppointmentClick = (appointment: Appointment) => {
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      toast({
        title: t("cannotEdit"),
        description: t("cannotModify"),
        variant: "destructive",
      });
      return;
    }

    setEditingAppointment(appointment);
    setNewDate(format(parseISO(appointment.startTime), "yyyy-MM-dd"));
    setNewStartTime(format(parseISO(appointment.startTime), "HH:mm"));
    setSendNotification(true);
    setEditDialogOpen(true);
  };

  // Save appointment changes
  const handleSaveAppointment = async () => {
    if (!editingAppointment) return;

    setSaving(true);
    try {
      const [hours, minutes] = newStartTime.split(":").map(Number);
      const newStart = new Date(newDate);
      newStart.setHours(hours, minutes, 0, 0);

      await appointmentsApi.update(editingAppointment.id, {
        startTime: newStart.toISOString(),
        sendNotification,
      });

      toast({
        title: t("appointmentUpdated"),
        description: sendNotification
          ? t("clientNotified")
          : t("movedSuccess"),
      });

      setEditDialogOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAppointment"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id: string) => {
    setCancelling(true);
    try {
      await appointmentsApi.cancel(id);

      toast({
        title: t("appointmentCancelled"),
        description: t("appointmentCancelledDesc"),
      });

      setEditDialogOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToCancelAppointment"),
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  // Confirm appointment
  const handleConfirmAppointment = async (id: string) => {
    setConfirming(true);
    try {
      await appointmentsApi.confirm(id);

      toast({
        title: t("appointmentConfirmed"),
        description: t("appointmentConfirmedDesc"),
      });

      setEditDialogOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToConfirmAppointment"),
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  // Complete appointment
  const handleCompleteAppointment = async (id: string) => {
    setCompleting(true);
    try {
      await appointmentsApi.complete(id);

      toast({
        title: t("appointmentCompleted"),
        description: t("appointmentCompletedDesc"),
      });

      setEditDialogOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToCompleteAppointment"),
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  // Day column ref handler
  const handleDayColumnRef = useCallback((el: HTMLDivElement | null, dayKey: string) => {
    if (el) {
      dayColumnsRef.current.set(dayKey, el);
    } else {
      dayColumnsRef.current.delete(dayKey);
    }
  }, []);

  // Handle empty slot click to create appointment
  const handleEmptySlotClick = useCallback((day: Date, time: string) => {
    setSelectedSlotDate(day);
    setSelectedSlotTime(time);
    setCreateFromButton(false);
    setCreateDialogOpen(true);
  }, []);

  // Handle add appointment from header button
  const handleAddAppointmentFromHeader = useCallback(() => {
    setSelectedSlotDate(currentDate);
    setSelectedSlotTime("09:00");
    setCreateFromButton(true);
    setCreateDialogOpen(true);
  }, [currentDate]);

  // Handle create appointment
  const handleCreateAppointment = async (data: {
    startTime: string;
    serviceOptionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    providerId?: string;
    notes?: string;
  }) => {
    setCreateSaving(true);
    try {
      await appointmentsApi.create(data);
      
      toast({
        title: t("appointmentCreated"),
        description: t("appointmentCreatedDesc"),
      });

      setCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create appointment:", error);
      toast({
        title: t("error"),
        description: t("failedToCreateAppointment"),
        variant: "destructive",
      });
    } finally {
      setCreateSaving(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CalendarHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentDate={currentDate}
            weekStart={weekStart}
            weekEnd={weekEnd}
            goToToday={goToToday}
            goToPrevious={goToPrevious}
            goToNext={goToNext}
            showMemberFilter={!!(currentOrganization && isAdmin)}
            selectedMember={selectedMember}
            setSelectedMember={setSelectedMember}
            members={members}
            onAddAppointment={handleAddAppointmentFromHeader}
          />
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea
            className={`h-[calc(100vh-220px)] min-h-[600px] ${dragState.isDragging ? "select-none" : ""}`}
            ref={scrollAreaRef}
          >
            <div className="flex">
              {/* Time Column */}
              <TimeColumn timeSlots={timeSlots} />

              {/* Day Columns */}
              {viewMode === "week"
                ? weekDays.map((day) => (
                    <DayColumn
                      key={day.toISOString()}
                      day={day}
                      events={getEventsForDay(day)}
                      dayAvailability={getAvailabilityForDay(day)}
                      dayBlockedTimes={getBlockedTimesForDay(day)}
                      timeSlots={timeSlots}
                      dragState={dragState}
                      onDragStart={handleDragStart}
                      onAppointmentClick={handleAppointmentClick}
                      findAppointmentById={findAppointmentById}
                      calculateTimeFromPosition={calculateTimeFromPosition}
                      dayColumnRef={handleDayColumnRef}
                      dragMovedRef={dragMovedRef}
                      justFinishedDragRef={justFinishedDragRef}
                      onEmptySlotClick={handleEmptySlotClick}
                    />
                  ))
                : (
                    <DayColumn
                      day={currentDate}
                      isOnly
                      events={getEventsForDay(currentDate)}
                      dayAvailability={getAvailabilityForDay(currentDate)}
                      dayBlockedTimes={getBlockedTimesForDay(currentDate)}
                      timeSlots={timeSlots}
                      dragState={dragState}
                      onDragStart={handleDragStart}
                      onAppointmentClick={handleAppointmentClick}
                      findAppointmentById={findAppointmentById}
                      calculateTimeFromPosition={calculateTimeFromPosition}
                      dayColumnRef={handleDayColumnRef}
                      dragMovedRef={dragMovedRef}
                      justFinishedDragRef={justFinishedDragRef}
                      onEmptySlotClick={handleEmptySlotClick}
                    />
                  )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        appointment={editingAppointment}
        newDate={newDate}
        setNewDate={setNewDate}
        newStartTime={newStartTime}
        setNewStartTime={setNewStartTime}
        sendNotification={sendNotification}
        setSendNotification={setSendNotification}
        saving={saving}
        onSave={handleSaveAppointment}
        onCancel={handleCancelAppointment}
        onConfirm={handleConfirmAppointment}
        onComplete={handleCompleteAppointment}
        cancelling={cancelling}
        confirming={confirming}
        completing={completing}
      />

      {/* Drag & Drop Confirmation Dialog */}
      <MoveConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        pendingChange={pendingChange}
        sendNotification={sendNotification}
        setSendNotification={setSendNotification}
        saving={saving}
        onConfirm={confirmPendingChange}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setPendingChange(null);
        }}
      />

      {/* Create Appointment Dialog */}
      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        selectedDate={selectedSlotDate}
        onSelectedDateChange={setSelectedSlotDate}
        selectedTime={selectedSlotTime}
        serviceOptions={serviceOptions}
        isAdmin={isAdmin}
        currentUserClerkId={user?.id || ""}
        saving={createSaving}
        onSave={handleCreateAppointment}
        fromButton={createFromButton}
        preselectedProviderId={selectedMember !== "all" ? selectedMember : undefined}
        timezone={organizationTimezone}
      />
    </div>
  );
}
