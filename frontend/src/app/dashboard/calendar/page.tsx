"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  appointmentsApi,
  serviceOptionsApi,
  availabilityApi,
  blockedTimesApi,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  Mail,
  CalendarDays,
  Calendar as CalendarIcon,
  Pencil,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeftRight,
  GripVertical,
  Users,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useOrganizationContext, OrganizationMember } from "@/components/providers/organization-provider";

// Types
interface CalendarEvent {
  appointment: Appointment;
  top: number;
  height: number;
  left: number;
  width: number;
  overlappingIndex: number;
  overlappingCount: number;
}

interface DragState {
  isDragging: boolean;
  hasMoved: boolean;
  appointmentId: string | null;
  originalTop: number;
  currentTop: number;
  originalDay: Date | null;
  currentDay: Date | null;
  offsetY: number;
}

interface PendingChange {
  type: "move" | "swap";
  appointment: Appointment;
  newStartTime: Date;
  newEndTime: Date;
  swapWith?: Appointment;
  swapWithNewStartTime?: Date;
  swapWithNewEndTime?: Date;
}

// Constants
const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function CalendarPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, isAdmin, members } = useOrganizationContext();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
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
  const [sendNotification, setSendNotification] = useState(true);

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
  const timeSlots = useMemo(() => {
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
    setAuthToken(token);
    if (currentOrganization) {
      setOrganizationContext(currentOrganization.id);
    }

    try {
      const startDate = format(viewMode === "week" ? weekStart : currentDate, "yyyy-MM-dd");
      const endDate = format(viewMode === "week" ? weekEnd : currentDate, "yyyy-MM-dd");

      // Build query params including member filter for org admins
      const appointmentParams: Record<string, unknown> = {
        startDate,
        endDate,
        limit: 100,
        sortBy: "startTime",
        sortOrder: "ASC",
      };

      // If admin and a specific member is selected, filter by userId
      if (currentOrganization && isAdmin && selectedMember !== "all") {
        appointmentParams.userId = selectedMember;
      }

      const [appointmentsRes, servicesRes, availabilityRes, blockedRes] = await Promise.all([
        appointmentsApi.getAll(appointmentParams),
        serviceOptionsApi.getAll(),
        availabilityApi.getAll(),
        blockedTimesApi.getAll({ startDate, endDate }),
      ]);

      setAppointments(appointmentsRes.data.data || appointmentsRes.data);
      setServiceOptions(servicesRes.data);
      setAvailabilities(availabilityRes.data);
      setBlockedTimes(blockedRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken, weekStart, weekEnd, currentDate, viewMode, toast, currentOrganization, isAdmin, selectedMember]);

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

      // Sort by start time
      dayAppointments.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Find overlapping appointments
      const events: CalendarEvent[] = [];
      const columns: Appointment[][] = [];

      for (const apt of dayAppointments) {
        const aptStart = parseISO(apt.startTime);
        const aptEnd = parseISO(apt.endTime);

        // Calculate position
        const startHour = aptStart.getHours() + aptStart.getMinutes() / 60;
        const endHour = aptEnd.getHours() + aptEnd.getMinutes() / 60;
        const top = (startHour - START_HOUR) * HOUR_HEIGHT;
        const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 20);

        // Find column for this appointment
        let columnIndex = 0;
        for (let i = 0; i < columns.length; i++) {
          const lastInColumn = columns[i][columns[i].length - 1];
          if (new Date(lastInColumn.endTime) <= aptStart) {
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

      // Adjust widths for overlapping events
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
      return availabilities.filter(
        (av) => av.dayOfWeek === dayOfWeek && av.isActive
      );
    },
    [availabilities]
  );

  // Check if a time slot is blocked
  const getBlockedTimesForDay = useCallback(
    (day: Date) => {
      return blockedTimes.filter((bt) =>
        isSameDay(parseISO(bt.date), day)
      );
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
    const minutes = Math.round(((y % HOUR_HEIGHT) / HOUR_HEIGHT) * 60 / 15) * 15; // Round to 15-min intervals
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
        const aptEnd = parseISO(apt.endTime);

        // Check if there's overlap
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

      // Find which day column we're over
      let targetDay = dragState.currentDay;
      dayColumnsRef.current.forEach((element, dateStr) => {
        const rect = element.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          targetDay = new Date(dateStr);
        }
      });

      // Calculate new top position relative to the time grid
      // Find the actual viewport element inside ScrollArea
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
        const scrollRect = viewport?.getBoundingClientRect() || scrollArea.getBoundingClientRect();
        const scrollTop = viewport?.scrollTop || 0;
        
        // Calculate position: mouse Y relative to viewport, plus scroll offset, minus header (48px)
        const relativeY = clientY - scrollRect.top + scrollTop - 48;
        // Subtract the grab offset to keep appointment under the mouse at grab point
        const newTop = Math.max(0, Math.min(relativeY - dragState.offsetY, TOTAL_HOURS * HOUR_HEIGHT - 20));

        // Check if actually moved (more than 5px threshold)
        const hasMoved = Math.abs(newTop - dragState.originalTop) > 5 || 
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

    // If didn't actually move, just reset state (click handler will open edit dialog)
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

    // Check if position actually changed
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

    // Check for overlapping appointments
    const overlappingApt = findOverlappingAppointment(
      newStartTime,
      newEndTime,
      appointment.id,
      dragState.currentDay
    );

    if (overlappingApt) {
      // Swap times
      const overlappingStart = parseISO(overlappingApt.startTime);
      const overlappingEnd = parseISO(overlappingApt.endTime);

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
      // Simple move
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
        // Update both appointments
        await Promise.all([
          appointmentsApi.update(pendingChange.appointment.id, {
            startTime: pendingChange.newStartTime.toISOString(),
          }),
          appointmentsApi.update(pendingChange.swapWith.id, {
            startTime: pendingChange.swapWithNewStartTime.toISOString(),
          }),
        ]);

        toast({
          title: "Appointments swapped",
          description: sendNotification
            ? "Both clients have been notified about the time changes"
            : "Appointment times swapped successfully",
        });
      } else {
        // Simple move
        await appointmentsApi.update(pendingChange.appointment.id, {
          startTime: pendingChange.newStartTime.toISOString(),
        });

        toast({
          title: "Appointment moved",
          description: sendNotification
            ? "The client has been notified about the time change"
            : "Appointment time changed successfully",
        });
      }

      setConfirmDialogOpen(false);
      setPendingChange(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment(s)",
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
        title: "Cannot edit",
        description: "This appointment cannot be modified",
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

      const duration = editingAppointment.serviceOption?.duration || 60;
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      await appointmentsApi.update(editingAppointment.id, {
        startTime: newStart.toISOString(),
      });

      toast({
        title: "Appointment updated",
        description: sendNotification
          ? "The client has been notified about the time change"
          : "Appointment time changed successfully",
      });

      setEditDialogOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Get status color
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "bg-green-500/90 hover:bg-green-500 border-green-600";
      case AppointmentStatus.PENDING_CONFIRMATION:
        return "bg-yellow-500/90 hover:bg-yellow-500 border-yellow-600";
      case AppointmentStatus.CANCELLED:
        return "bg-red-500/90 hover:bg-red-500 border-red-600";
      case AppointmentStatus.COMPLETED:
        return "bg-blue-500/90 hover:bg-blue-500 border-blue-600";
      case AppointmentStatus.NO_SHOW:
        return "bg-gray-500/90 hover:bg-gray-500 border-gray-600";
      default:
        return "bg-primary/90 hover:bg-primary border-primary";
    }
  };

  // Render time column
  const renderTimeColumn = () => (
    <div className="w-16 flex-shrink-0 border-r bg-muted/30">
      <div className="h-12 border-b" /> {/* Header spacer */}
      {timeSlots.map((slot) => (
        <div
          key={slot.hour}
          className="h-[60px] border-b text-xs text-muted-foreground pr-2 text-right pt-0 -translate-y-2"
        >
          {slot.label}
        </div>
      ))}
    </div>
  );

  // Render day column
  const renderDayColumn = (day: Date, isOnly: boolean = false) => {
    const events = getEventsForDay(day);
    const dayAvailability = getAvailabilityForDay(day);
    const dayBlockedTimes = getBlockedTimesForDay(day);
    const isDayToday = isToday(day);
    const dayKey = day.toISOString();

    // Check if dragged appointment should show in this column
    const draggedEvent = dragState.isDragging && dragState.currentDay && isSameDay(dragState.currentDay, day)
      ? (() => {
          const apt = findAppointmentById(dragState.appointmentId || "");
          if (!apt) return null;
          // Use actual appointment times for consistent height calculation
          const aptStart = parseISO(apt.startTime);
          const aptEnd = parseISO(apt.endTime);
          const durationMinutes = differenceInMinutes(aptEnd, aptStart);
          const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
          return { appointment: apt, top: dragState.currentTop, height };
        })()
      : null;

    return (
      <div
        key={dayKey}
        ref={(el) => {
          if (el) {
            dayColumnsRef.current.set(dayKey, el);
          } else {
            dayColumnsRef.current.delete(dayKey);
          }
        }}
        className={`flex-1 min-w-[120px] border-r last:border-r-0 relative ${
          isOnly ? "flex-grow" : ""
        } ${dragState.isDragging ? "cursor-grabbing" : ""}`}
      >
        {/* Day Header */}
        <div
          className={`h-12 border-b px-2 py-1 flex flex-col items-center justify-center sticky top-0 bg-background z-10 ${
            isDayToday ? "bg-primary/10" : ""
          }`}
        >
          <span className="text-xs text-muted-foreground uppercase">
            {format(day, "EEE")}
          </span>
          <span
            className={`text-lg font-semibold ${
              isDayToday
                ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center"
                : ""
            }`}
          >
            {format(day, "d")}
          </span>
        </div>

        {/* Time Grid */}
        <div className="relative">
          {/* Hour lines */}
          {timeSlots.map((slot) => (
            <div key={slot.hour} className="h-[60px] border-b border-dashed border-muted" />
          ))}

          {/* Availability background */}
          {dayAvailability.map((av, idx) => {
            const [startH, startM] = av.startTime.split(":").map(Number);
            const [endH, endM] = av.endTime.split(":").map(Number);
            const startHour = startH + startM / 60;
            const endHour = endH + endM / 60;
            const top = Math.max(0, (startHour - START_HOUR) * HOUR_HEIGHT);
            const bottom = Math.min(TOTAL_HOURS * HOUR_HEIGHT, (endHour - START_HOUR) * HOUR_HEIGHT);
            const height = bottom - top;

            return (
              <div
                key={`av-${idx}`}
                className="absolute left-0 right-0 bg-green-100/50 dark:bg-green-900/20 pointer-events-none"
                style={{ top: `${top}px`, height: `${height}px` }}
              />
            );
          })}

          {/* Blocked times */}
          {dayBlockedTimes.map((bt, idx) => {
            if (bt.isFullDay) {
              return (
                <div
                  key={`bt-${idx}`}
                  className="absolute inset-0 bg-red-100/50 dark:bg-red-900/20 pointer-events-none flex items-center justify-center"
                >
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {bt.reason || "Blocked"}
                  </span>
                </div>
              );
            }

            if (!bt.startTime || !bt.endTime) return null;

            const [startH, startM] = bt.startTime.split(":").map(Number);
            const [endH, endM] = bt.endTime.split(":").map(Number);
            const startHour = startH + startM / 60;
            const endHour = endH + endM / 60;
            const top = Math.max(0, (startHour - START_HOUR) * HOUR_HEIGHT);
            const bottom = Math.min(TOTAL_HOURS * HOUR_HEIGHT, (endHour - START_HOUR) * HOUR_HEIGHT);
            const height = bottom - top;

            return (
              <div
                key={`bt-${idx}`}
                className="absolute left-0 right-0 bg-red-100/50 dark:bg-red-900/20 pointer-events-none"
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                {height > 20 && (
                  <span className="text-xs text-red-600 dark:text-red-400 p-1 truncate block">
                    {bt.reason || "Blocked"}
                  </span>
                )}
              </div>
            );
          })}

          {/* Events */}
          {events.map((event) => {
            const isDragging = dragState.isDragging && dragState.appointmentId === event.appointment.id;
            const canDrag =
              event.appointment.status !== AppointmentStatus.CANCELLED &&
              event.appointment.status !== AppointmentStatus.COMPLETED;

            // Don't render if this is the dragged item (we'll show it as ghost)
            if (isDragging && !isSameDay(dragState.currentDay!, day)) {
              return null;
            }

            return (
              <div
                key={event.appointment.id}
                className={`absolute rounded-md border-l-4 p-1 text-white text-xs overflow-hidden transition-shadow shadow-sm ${getStatusColor(
                  event.appointment.status
                )} ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${
                  isDragging ? "opacity-50 ring-2 ring-primary ring-offset-2" : ""
                }`}
                style={{
                  top: isDragging ? `${dragState.currentTop}px` : `${event.top}px`,
                  height: `${event.height}px`,
                  left: `${event.left}%`,
                  width: `calc(${event.width}% - 4px)`,
                  marginLeft: "2px",
                  zIndex: isDragging ? 50 : 1,
                }}
                onMouseDown={(e) => canDrag && handleDragStart(e, event.appointment, day)}
                onTouchStart={(e) => canDrag && handleDragStart(e, event.appointment, day)}
                onClick={(e) => {
                  // Only open edit dialog if we didn't drag (just a click)
                  if (!dragMovedRef.current) {
                    handleAppointmentClick(event.appointment);
                  }
                  dragMovedRef.current = false;
                }}
              >
                <div className="flex items-start gap-1">
                  {canDrag && (
                    <GripVertical className="h-3 w-3 flex-shrink-0 opacity-70 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {event.appointment.clientName}
                    </div>
                    {event.height > 35 && (
                      <div className="opacity-90 truncate">
                        {format(parseISO(event.appointment.startTime), "h:mm a")}
                      </div>
                    )}
                    {event.height > 55 && event.appointment.serviceOption && (
                      <div className="opacity-80 truncate">
                        {event.appointment.serviceOption.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dragged event ghost (when moving to different day) */}
          {draggedEvent && !events.some((e) => e.appointment.id === draggedEvent.appointment.id) && (
            <div
              className={`absolute rounded-md border-l-4 border-dashed p-1 text-white text-xs overflow-hidden ${getStatusColor(
                draggedEvent.appointment.status
              )} opacity-70 ring-2 ring-primary ring-offset-2 pointer-events-none`}
              style={{
                top: `${draggedEvent.top}px`,
                height: `${draggedEvent.height}px`,
                left: "2px",
                right: "2px",
                zIndex: 50,
              }}
            >
              <div className="font-medium truncate">
                {draggedEvent.appointment.clientName}
              </div>
              {draggedEvent.height > 35 && (
                <div className="opacity-90 truncate">
                  {format(
                    calculateTimeFromPosition(draggedEvent.top, day),
                    "h:mm a"
                  )}
                </div>
              )}
            </div>
          )}

          {/* Current time indicator */}
          {isDayToday && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-20"
              style={{
                top: `${
                  (new Date().getHours() +
                    new Date().getMinutes() / 60 -
                    START_HOUR) *
                  HOUR_HEIGHT
                }px`,
              }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[600px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {viewMode === "week"
                  ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
                  : format(currentDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Member Filter (Organization Admin only) */}
              {currentOrganization && isAdmin && members.length > 0 && (
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-[200px]">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Members
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.clerkId} value={member.clerkId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.imageUrl} />
                            <AvatarFallback className="text-xs">
                              {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {member.firstName 
                              ? `${member.firstName} ${member.lastName || ''}`
                              : member.email.split('@')[0]}
                          </span>
                          {member.role === 'org:admin' && (
                            <Badge variant="outline" className="text-xs ml-1">Admin</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "day")}>
                <TabsList>
                  <TabsTrigger value="week" className="px-3">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="day" className="px-3">
                    <Clock className="h-4 w-4 mr-1" />
                    Day
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
              <span className="text-muted-foreground">Blocked</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Drag to reschedule</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea 
            className={`h-[calc(100vh-220px)] min-h-[600px] ${dragState.isDragging ? "select-none" : ""}`}
            ref={scrollAreaRef}
          >
            <div className="flex">
              {/* Time Column */}
              {renderTimeColumn()}

              {/* Day Columns */}
              {viewMode === "week" ? (
                weekDays.map((day) => renderDayColumn(day))
              ) : (
                renderDayColumn(currentDate, true)
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Appointment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Appointment
            </DialogTitle>
            <DialogDescription>
              Update the appointment time. The client will be notified of any changes.
            </DialogDescription>
          </DialogHeader>

          {editingAppointment && (
            <div className="space-y-6 py-4">
              {/* Client Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{editingAppointment.clientName}</span>
                  <Badge variant="outline" className="ml-auto">
                    {editingAppointment.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {editingAppointment.clientEmail}
                </div>
                {editingAppointment.clientPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {editingAppointment.clientPhone}
                  </div>
                )}
                {editingAppointment.serviceOption && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {editingAppointment.serviceOption.title} ({editingAppointment.serviceOption.duration} min)
                  </div>
                )}
              </div>

              {/* Current Time */}
              <div>
                <Label className="text-muted-foreground">Current Time</Label>
                <p className="text-sm font-medium mt-1">
                  {format(parseISO(editingAppointment.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              {/* New Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-date">New Date</Label>
                  <Input
                    id="new-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-time">New Time</Label>
                  <Input
                    id="new-time"
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </div>
              </div>

              {/* New Time Preview */}
              {newDate && newStartTime && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">New appointment time: </span>
                    <span className="font-medium">
                      {format(
                        new Date(`${newDate}T${newStartTime}`),
                        "EEEE, MMMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </p>
                </div>
              )}

              {/* Notification Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Notify Client</p>
                  <p className="text-xs text-muted-foreground">
                    Send an email/SMS notification about the time change
                  </p>
                </div>
                <Button
                  variant={sendNotification ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendNotification(!sendNotification)}
                >
                  {sendNotification ? "On" : "Off"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAppointment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag & Drop Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => {
        if (!open && !saving) {
          setConfirmDialogOpen(false);
          setPendingChange(null);
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingChange?.type === "swap" ? (
                <>
                  <ArrowLeftRight className="h-5 w-5" />
                  Swap Appointment Times
                </>
              ) : (
                <>
                  <CalendarDays className="h-5 w-5" />
                  Move Appointment
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {pendingChange?.type === "swap"
                ? "The appointments overlap. Their times will be swapped."
                : "Confirm the new appointment time."}
            </DialogDescription>
          </DialogHeader>

          {pendingChange && (
            <div className="space-y-4 py-4">
              {/* Primary appointment */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{pendingChange.appointment.clientName}</span>
                  <Badge variant="outline" className="ml-auto">
                    {pendingChange.appointment.status.replace("_", " ")}
                  </Badge>
                </div>
                {pendingChange.appointment.serviceOption && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {pendingChange.appointment.serviceOption.title}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Time</p>
                    <p className="text-sm font-medium">
                      {format(parseISO(pendingChange.appointment.startTime), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">New Time</p>
                    <p className="text-sm font-medium text-primary">
                      {format(pendingChange.newStartTime, "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Swap target appointment */}
              {pendingChange.type === "swap" && pendingChange.swapWith && pendingChange.swapWithNewStartTime && (
                <>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{pendingChange.swapWith.clientName}</span>
                      <Badge variant="outline" className="ml-auto">
                        {pendingChange.swapWith.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {pendingChange.swapWith.serviceOption && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {pendingChange.swapWith.serviceOption.title}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Time</p>
                        <p className="text-sm font-medium">
                          {format(parseISO(pendingChange.swapWith.startTime), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">New Time</p>
                        <p className="text-sm font-medium text-primary">
                          {format(pendingChange.swapWithNewStartTime, "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notification Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Notify Client{pendingChange.type === "swap" ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    Send email/SMS notification about the time change
                  </p>
                </div>
                <Button
                  variant={sendNotification ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendNotification(!sendNotification)}
                >
                  {sendNotification ? "On" : "Off"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setPendingChange(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={confirmPendingChange} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {pendingChange?.type === "swap" ? "Swap Times" : "Move Appointment"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
