"use client";

import { format, parseISO, isToday, isSameDay, differenceInMinutes, type Locale } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useLocale } from "@/components/providers/locale-provider";
import { Appointment, Availability, BlockedTime } from "@/lib/types";
import {
  CalendarEvent,
  DragState,
  TimeSlot,
  HOUR_HEIGHT,
  START_HOUR,
  TOTAL_HOURS,
} from "./types";
import { CalendarEventItem, DraggedEventGhost } from "./CalendarEventItem";

interface DayColumnProps {
  day: Date;
  isOnly?: boolean;
  events: CalendarEvent[];
  dayAvailability: Availability[];
  dayBlockedTimes: BlockedTime[];
  timeSlots: TimeSlot[];
  dragState: DragState;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, appointment: Appointment, day: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onEmptySlotClick?: (day: Date, time: string) => void;
  findAppointmentById: (id: string) => Appointment | undefined;
  calculateTimeFromPosition: (y: number, day: Date) => Date;
  dayColumnRef: (el: HTMLDivElement | null, dayKey: string) => void;
  dragMovedRef: React.MutableRefObject<boolean>;
  justFinishedDragRef: React.MutableRefObject<boolean>;
}

export function DayColumn({
  day,
  isOnly = false,
  events,
  dayAvailability,
  dayBlockedTimes,
  timeSlots,
  dragState,
  onDragStart,
  onAppointmentClick,
  onEmptySlotClick,
  findAppointmentById,
  calculateTimeFromPosition,
  dayColumnRef,
  dragMovedRef,
  justFinishedDragRef,
}: DayColumnProps) {
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? tr : enUS;
  const isDayToday = isToday(day);
  const dayKey = day.toISOString();

  // Check if dragged appointment should show in this column
  const draggedEvent =
    dragState.isDragging && dragState.currentDay && isSameDay(dragState.currentDay, day)
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

  // Handle click on empty slot
  const handleTimeGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle if dragging or if clicking on an event
    if (dragState.isDragging || dragMovedRef.current || justFinishedDragRef.current) {
      return;
    }

    // Check if clicked on an event element
    const target = e.target as HTMLElement;
    if (target.closest('[data-appointment]')) {
      return;
    }

    // Calculate time from click position
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedTime = calculateTimeFromPosition(y, day);
    const timeString = format(clickedTime, "HH:mm");

    onEmptySlotClick?.(day, timeString);
  };

  return (
    <div
      ref={(el) => dayColumnRef(el, dayKey)}
      className={`flex-1 min-w-[120px] border-r last:border-r-0 relative ${
        isOnly ? "flex-grow" : ""
      } ${dragState.isDragging ? "cursor-grabbing" : ""}`}
    >
      {/* Day Header */}
      <DayHeader day={day} isDayToday={isDayToday} dateLocale={dateLocale} />

      {/* Time Grid */}
      <div 
        className="relative cursor-pointer"
        onClick={handleTimeGridClick}
      >
        {/* Hour lines */}
        {timeSlots.map((slot) => (
          <div key={slot.hour} className="h-[60px] border-b border-dashed border-muted" />
        ))}

        {/* Availability background */}
        <AvailabilityOverlay dayAvailability={dayAvailability} />

        {/* Blocked times */}
        <BlockedTimesOverlay dayBlockedTimes={dayBlockedTimes} />

        {/* Events */}
        {events.map((event) => {
          const isDragging =
            dragState.isDragging && dragState.appointmentId === event.appointment.id;

          // Don't render if this is the dragged item moving to a different day
          if (isDragging && !isSameDay(dragState.currentDay!, day)) {
            return null;
          }

          return (
            <CalendarEventItem
              key={event.appointment.id}
              event={event}
              day={day}
              dragState={dragState}
              onDragStart={onDragStart}
              onClick={onAppointmentClick}
              dragMovedRef={dragMovedRef}
              justFinishedDragRef={justFinishedDragRef}
            />
          );
        })}

        {/* Dragged event ghost (when moving to different day) */}
        {draggedEvent &&
          !events.some((e) => e.appointment.id === draggedEvent.appointment.id) && (
            <DraggedEventGhost
              appointment={draggedEvent.appointment}
              top={draggedEvent.top}
              height={draggedEvent.height}
              day={day}
              calculateTimeFromPosition={calculateTimeFromPosition}
            />
          )}

        {/* Current time indicator */}
        {isDayToday && <CurrentTimeIndicator />}
      </div>
    </div>
  );
}

interface DayHeaderProps {
  day: Date;
  isDayToday: boolean;
  dateLocale: Locale;
}

function DayHeader({ day, isDayToday, dateLocale }: DayHeaderProps) {
  return (
    <div
      className={`h-12 border-b px-2 py-1 flex flex-col items-center justify-center sticky top-0 bg-background z-10 ${
        isDayToday ? "bg-primary/10" : ""
      }`}
    >
      <span className="text-xs text-muted-foreground uppercase">
        {format(day, "EEE", { locale: dateLocale })}
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
  );
}

interface AvailabilityOverlayProps {
  dayAvailability: Availability[];
}

function AvailabilityOverlay({ dayAvailability }: AvailabilityOverlayProps) {
  return (
    <>
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
    </>
  );
}

interface BlockedTimesOverlayProps {
  dayBlockedTimes: BlockedTime[];
}

function BlockedTimesOverlay({ dayBlockedTimes }: BlockedTimesOverlayProps) {
  return (
    <>
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
    </>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const top = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-20"
      style={{ top: `${top}px` }}
    >
      <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
    </div>
  );
}
