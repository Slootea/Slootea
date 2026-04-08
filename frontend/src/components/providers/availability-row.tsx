"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, XCircle } from "lucide-react";
import { Availability } from "@/lib/types";
import { DAY_NAMES } from "./types";

interface AvailabilityRowProps {
  day: number;
  availabilities: Availability[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function AvailabilityRow({
  day,
  availabilities,
  onAdd,
  onDelete,
}: AvailabilityRowProps) {
  const dayAvailabilities = availabilities.filter(a => a.dayOfWeek === day);
  
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-b-0">
      <div className="flex-1">
        <div className="font-medium text-sm">{DAY_NAMES[day]}</div>
        {dayAvailabilities.length === 0 ? (
          <div className="text-sm text-muted-foreground">Unavailable</div>
        ) : (
          <div className="flex flex-wrap gap-2 mt-1">
            {dayAvailabilities.map((av) => (
              <Badge key={av.id} variant="secondary" className="gap-1">
                {av.startTime.slice(0, 5)} - {av.endTime.slice(0, 5)}
                <button
                  onClick={() => onDelete(av.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
