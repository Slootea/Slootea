"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Ban } from "lucide-react";

interface BlockTimeRangePickerProps {
  startTime: string;
  endTime: string;
  onTimeChange: (start: string, end: string) => void;
}

export function BlockTimeRangePicker({
  startTime,
  endTime,
  onTimeChange,
}: BlockTimeRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);

  const totalHours = 24;
  const snapInterval = 15;

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const snapToInterval = (minutes: number) => {
    return Math.round(minutes / snapInterval) * snapInterval;
  };

  const getPositionPercent = (minutes: number) => {
    return (minutes / (totalHours * 60)) * 100;
  };

  const getMinutesFromPosition = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(percent * totalHours * 60);
  };

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const minutes = getMinutesFromPosition(e.clientX);
    const snappedMinutes = snapToInterval(minutes);
    
    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(snappedMinutes, endMinutes - snapInterval));
      onTimeChange(minutesToTime(newStart), endTime);
    } else if (isDragging === 'end') {
      const newEnd = Math.min(totalHours * 60, Math.max(snappedMinutes, startMinutes + snapInterval));
      onTimeChange(startTime, minutesToTime(newEnd));
    } else if (isDragging === 'move') {
      const duration = endMinutes - startMinutes;
      const halfDuration = duration / 2;
      let newStart = snapToInterval(snappedMinutes - halfDuration);
      let newEnd = newStart + duration;
      
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
  }, [isDragging, startMinutes, endMinutes, startTime, endTime, onTimeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const minutes = getMinutesFromPosition(e.clientX);
    const duration = endMinutes - startMinutes;
    const halfDuration = duration / 2;
    
    let newStart = snapToInterval(minutes - halfDuration);
    let newEnd = newStart + duration;
    
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

  const leftPercent = getPositionPercent(startMinutes);
  const widthPercent = getPositionPercent(endMinutes - startMinutes);

  return (
    <div className="p-4 rounded-xl border bg-card space-y-4">
      {/* Header with time display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
            <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Drag to select blocked time</p>
            <p className="text-xs text-muted-foreground">Click or drag to adjust</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-background">
            {startTime} – {endTime}
          </Badge>
          <Badge className="font-mono bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-100">
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
        onClick={handleContainerClick}
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
            absolute top-1.5 bottom-1.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-md shadow-lg
            ${isDragging === 'move' ? 'cursor-grabbing' : 'cursor-grab'}
            transition-shadow hover:shadow-xl
          `}
          style={{ 
            left: `${leftPercent}%`, 
            width: `${widthPercent}%`,
            minWidth: '40px'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          {/* Start handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize group flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            <div className="w-1 h-6 bg-white/50 rounded-full group-hover:bg-white/80 transition-colors" />
          </div>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <span className="text-xs font-semibold text-white drop-shadow-sm truncate">
              {startTime} – {endTime}
            </span>
          </div>
          
          {/* End handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize group flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            <div className="w-1 h-6 bg-white/50 rounded-full group-hover:bg-white/80 transition-colors" />
          </div>
        </div>
      </div>

      {/* Quick duration presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Quick:</span>
        {[
          { label: "1h", duration: 60 },
          { label: "2h", duration: 120 },
          { label: "4h", duration: 240 },
          { label: "Morning", start: "06:00", end: "12:00" },
          { label: "Afternoon", start: "12:00", end: "18:00" },
          { label: "Full Day", start: "00:00", end: "23:59" },
        ].map((preset) => {
          const isActive = 'start' in preset 
            ? startTime === preset.start && endTime === preset.end
            : durationMinutes === preset.duration;
          
          return (
            <button
              key={preset.label}
              onClick={() => {
                if ('start' in preset && preset.start && preset.end) {
                  onTimeChange(preset.start, preset.end);
                } else if ('duration' in preset && preset.duration) {
                  const duration = preset.duration;
                  const newEnd = Math.min(startMinutes + duration, totalHours * 60);
                  const newStart = newEnd === totalHours * 60 ? newEnd - duration : startMinutes;
                  onTimeChange(minutesToTime(newStart), minutesToTime(newEnd));
                }
              }}
              className={`
                px-2.5 py-1 text-xs font-medium rounded-md transition-all border
                ${isActive 
                  ? "bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300" 
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
