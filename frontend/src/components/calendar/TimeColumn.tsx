"use client";

import { TimeSlot, HOUR_HEIGHT } from "./types";

interface TimeColumnProps {
  timeSlots: TimeSlot[];
}

export function TimeColumn({ timeSlots }: TimeColumnProps) {
  return (
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
}
