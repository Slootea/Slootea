"use client";

import { format, parseISO } from "date-fns";
import { GripVertical } from "lucide-react";
import { Appointment, AppointmentStatus } from "@/lib/types";
import { CalendarEvent, DragState, getStatusColor } from "./types";

interface CalendarEventItemProps {
  event: CalendarEvent;
  day: Date;
  dragState: DragState;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, appointment: Appointment, day: Date) => void;
  onClick: (appointment: Appointment) => void;
  dragMovedRef: React.MutableRefObject<boolean>;
  justFinishedDragRef: React.MutableRefObject<boolean>;
}

export function CalendarEventItem({
  event,
  day,
  dragState,
  onDragStart,
  onClick,
  dragMovedRef,
  justFinishedDragRef,
}: CalendarEventItemProps) {
  const isDragging = dragState.isDragging && dragState.appointmentId === event.appointment.id;
  const canDrag =
    event.appointment.status !== AppointmentStatus.CANCELLED &&
    event.appointment.status !== AppointmentStatus.COMPLETED;

  return (
    <div
      data-appointment
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
      onMouseDown={(e) => canDrag && onDragStart(e, event.appointment, day)}
      onTouchStart={(e) => canDrag && onDragStart(e, event.appointment, day)}
      onClick={(e) => {
        e.stopPropagation();
        // Only open edit dialog if we didn't drag (just a click)
        if (!dragMovedRef.current && !justFinishedDragRef.current) {
          onClick(event.appointment);
        }
        dragMovedRef.current = false;
      }}
    >
      <div className="flex items-start gap-1">
        {canDrag && (
          <GripVertical className="h-3 w-3 flex-shrink-0 opacity-70 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{event.appointment.clientName}</div>
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
}

interface DraggedEventGhostProps {
  appointment: Appointment;
  top: number;
  height: number;
  day: Date;
  calculateTimeFromPosition: (y: number, day: Date) => Date;
}

export function DraggedEventGhost({
  appointment,
  top,
  height,
  day,
  calculateTimeFromPosition,
}: DraggedEventGhostProps) {
  return (
    <div
      className={`absolute rounded-md border-l-4 border-dashed p-1 text-white text-xs overflow-hidden ${getStatusColor(
        appointment.status
      )} opacity-70 ring-2 ring-primary ring-offset-2 pointer-events-none`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: "2px",
        right: "2px",
        zIndex: 50,
      }}
    >
      <div className="font-medium truncate">{appointment.clientName}</div>
      {height > 35 && (
        <div className="opacity-90 truncate">
          {format(calculateTimeFromPosition(top, day), "h:mm a")}
        </div>
      )}
    </div>
  );
}
