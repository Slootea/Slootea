"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Moon, Sun, Sunrise, Sunset } from "lucide-react";

interface VisualTimeRangePickerProps {
  startTime: string;
  endTime: string;
  onTimeChange: (start: string, end: string) => void;
}

export function VisualTimeRangePicker({
  startTime,
  endTime,
  onTimeChange,
}: VisualTimeRangePickerProps) {
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
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(x / rect.width, 1));
    const minutes = snapToInterval(percent * totalHours * 60);
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
    { label: t?.("presets.morning") || "Morning", icon: Sunrise, start: "06:00", end: "12:00", color: "text-amber-500" },
    { label: t?.("presets.afternoon") || "Afternoon", icon: Sun, start: "12:00", end: "18:00", color: "text-sky-500" },
    { label: t?.("presets.evening") || "Evening", icon: Sunset, start: "18:00", end: "23:00", color: "text-indigo-500" },
    { label: t?.("presets.fullDay") || "Full Day", icon: Clock, start: "00:00", end: "23:59", color: "text-emerald-500" },
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
              <p className="text-sm font-medium">Drag to select time</p>
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
          {/* Time period backgrounds */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="w-[25%] bg-slate-800/5 dark:bg-slate-300/5" />
            <div className="w-[25%] bg-amber-500/5" />
            <div className="w-[25%] bg-sky-500/5" />
            <div className="w-[25%] bg-indigo-500/5" />
          </div>
          
          {/* Hour markers */}
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour}
                className={`flex-1 border-r ${hour % 6 === 0 ? 'border-border/30' : 'border-border/10'}`}
              />
            ))}
          </div>
          
          {/* Selected time range bar */}
          <div
            className={`
              absolute top-1.5 bottom-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-md shadow-lg
              ${isDragging === 'range' ? 'cursor-grabbing' : 'cursor-grab'}
              transition-shadow hover:shadow-xl
            `}
            style={{ 
              left: `${leftPercent}%`, 
              width: `${widthPercent}%`,
              minWidth: '40px'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'range')}
            onTouchStart={(e) => handleMouseDown(e, 'range')}
          >
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
              <span className="text-xs font-semibold text-white drop-shadow-sm truncate">
                {startTime} – {endTime}
              </span>
            </div>
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
