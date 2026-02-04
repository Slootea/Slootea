import { Appointment, AppointmentStatus } from "@/lib/types";

export interface CalendarEvent {
  appointment: Appointment;
  top: number;
  height: number;
  left: number;
  width: number;
  overlappingIndex: number;
  overlappingCount: number;
}

export interface DragState {
  isDragging: boolean;
  hasMoved: boolean;
  appointmentId: string | null;
  originalTop: number;
  currentTop: number;
  originalDay: Date | null;
  currentDay: Date | null;
  offsetY: number;
}

export interface PendingChange {
  type: "move" | "swap";
  appointment: Appointment;
  newStartTime: Date;
  newEndTime: Date;
  swapWith?: Appointment;
  swapWithNewStartTime?: Date;
  swapWithNewEndTime?: Date;
}

export interface TimeSlot {
  hour: number;
  label: string;
}

// Constants
export const HOUR_HEIGHT = 60; // pixels per hour
export const START_HOUR = 0; // 12 AM (midnight)
export const END_HOUR = 24; // 12 AM (next day)
export const TOTAL_HOURS = END_HOUR - START_HOUR;

// Helper function for status colors
export const getStatusColor = (status: AppointmentStatus): string => {
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
