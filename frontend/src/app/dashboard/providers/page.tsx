"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  externalProvidersApi,
  serviceOptionsApi,
  organizationsApi,
  availabilityApi,
  blockedTimesApi,
  userServiceOptionsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  ExternalProvider,
  ExternalProviderServiceOption,
  ServiceOption,
  Availability,
  BlockedTime,
  OrganizationMember,
  UserServiceOption,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import {
  Plus,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
  User as UserIcon,
  Clock,
  Briefcase,
  XCircle,
  Image as ImageIcon,
  CalendarX,
  Ban,
  Users,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Day names for availability
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ============ Visual Time Range Picker Component ============
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

// ============ Block Time Range Picker Component ============
function BlockTimeRangePicker({
  startTime,
  endTime,
  onTimeChange,
}: {
  startTime: string;
  endTime: string;
  onTimeChange: (start: string, end: string) => void;
}) {
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

// ============ Loading Skeleton ============
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Empty State ============
function EmptyState({ message, onCreateClick, buttonText }: { message: string; onCreateClick?: () => void; buttonText?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <UserIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{message}</p>
      {onCreateClick && buttonText && (
        <Button onClick={onCreateClick}>
          <UserPlus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      )}
    </div>
  );
}

// ============ Provider Card ============
function ProviderCard({
  provider,
  type,
  onEdit,
  onDelete,
}: {
  provider: { id: string; name: string; imageUrl?: string; isActive?: boolean };
  type: 'member' | 'external';
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const initials = provider.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="h-16 w-16">
            {provider.imageUrl ? (
              <AvatarImage src={provider.imageUrl} alt={provider.name} />
            ) : null}
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2">
            {type === 'external' && provider.isActive !== undefined && !provider.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Manage
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg">{provider.name}</h3>
      </CardContent>
    </Card>
  );
}

// ============ Availability Row Component ============
function AvailabilityRow({
  day,
  availabilities,
  onAdd,
  onDelete,
}: {
  day: number;
  availabilities: Availability[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
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

// ============ Main Page Component ============
export default function ProvidersPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, isAdmin } = useOrganizationContext();
  const t = useTranslations('providersPage');
  const common = useTranslations('common');

  // State
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [externalProviders, setExternalProviders] = useState<ExternalProvider[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<'member' | 'external'>('member');
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [editingProvider, setEditingProvider] = useState<ExternalProvider | null>(null);
  const [activeTab, setActiveTab] = useState("availability");
  const [saving, setSaving] = useState(false);

  // External provider form data
  const [formData, setFormData] = useState({
    name: "",
    imageBase64: "",
    isActive: true,
  });
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  // Availability state
  const [providerAvailability, setProviderAvailability] = useState<Availability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [addAvailabilityDialogOpen, setAddAvailabilityDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [newAvailability, setNewAvailability] = useState({
    startTime: "09:00",
    endTime: "17:00",
  });

  // Blocked times state
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [blockedTimesLoading, setBlockedTimesLoading] = useState(false);
  const [addBlockedTimeDialogOpen, setAddBlockedTimeDialogOpen] = useState(false);
  const [newBlockedTime, setNewBlockedTime] = useState({
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    isFullDay: true,
    reason: "",
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ExternalProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============ Data Fetching ============
  const fetchData = useCallback(
    async (showRefreshing = false) => {
      const token = await getToken();
      if (!token) return;
      setAuthToken(token);

      if (!currentOrganization) {
        setMembers([]);
        setExternalProviders([]);
        setServiceOptions([]);
        setLoading(false);
        return;
      }

      setOrganizationContext(currentOrganization.id);

      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const [membersRes, providersRes, servicesRes] = await Promise.all([
          organizationsApi.getMembers(currentOrganization.id),
          externalProvidersApi.getAll(),
          serviceOptionsApi.getAllForOrganization(),
        ]);
        setMembers(membersRes.data || []);
        setExternalProviders(providersRes.data || []);
        setServiceOptions(servicesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
          title: t('error.title'),
          description: t('error.loadFailed'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, currentOrganization, toast, t]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============ Member Operations ============
  const fetchMemberDetails = async (userId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setAvailabilityLoading(true);
    setBlockedTimesLoading(true);

    try {
      const [servicesRes, availabilityRes, blockedTimesRes] = await Promise.all([
        userServiceOptionsApi.getMemberServices(userId),
        availabilityApi.getForMember(userId),
        blockedTimesApi.getForMember(userId),
      ]);
      
      const services = servicesRes.data as UserServiceOption[];
      setAssignedServiceIds(services.map(s => s.serviceOptionId));
      setProviderAvailability(availabilityRes.data || []);
      setBlockedTimes(blockedTimesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch member details", error);
    } finally {
      setAvailabilityLoading(false);
      setBlockedTimesLoading(false);
    }
  };

  const handleEditMember = async (member: OrganizationMember) => {
    setEditingType('member');
    setEditingMember(member);
    setEditingProvider(null);
    setServiceSearch('');
    setActiveTab("services");
    setDialogOpen(true);
    if (member.user?.id) {
      await fetchMemberDetails(member.user.id);
    }
  };

  // ============ External Provider Operations ============
  const fetchProviderDetails = async (providerId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setAvailabilityLoading(true);
    setBlockedTimesLoading(true);

    try {
      const [servicesRes, availabilityRes, blockedTimesRes] = await Promise.all([
        externalProvidersApi.getAssignedServices(providerId),
        externalProvidersApi.getAvailability(providerId),
        externalProvidersApi.getBlockedTimes(providerId),
      ]);

      const services = servicesRes.data as ExternalProviderServiceOption[];
      setAssignedServiceIds(services.map(s => s.serviceOptionId));
      setProviderAvailability(availabilityRes.data || []);
      setBlockedTimes(blockedTimesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch provider details", error);
    } finally {
      setAvailabilityLoading(false);
      setBlockedTimesLoading(false);
    }
  };

  const handleCreateProvider = () => {
    setEditingType('external');
    setEditingProvider(null);
    setEditingMember(null);
    setFormData({ name: "", imageBase64: "", isActive: true });
    setAssignedServiceIds([]);
    setProviderAvailability([]);
    setBlockedTimes([]);
    setServiceSearch('');
    setActiveTab("details");
    setDialogOpen(true);
  };

  const handleEditProvider = async (provider: ExternalProvider) => {
    setEditingType('external');
    setEditingProvider(provider);
    setEditingMember(null);
    setFormData({
      name: provider.name,
      imageBase64: provider.imageBase64 || "",
      isActive: provider.isActive,
    });
    setServiceSearch('');
    setActiveTab("details");
    setDialogOpen(true);
    await fetchProviderDetails(provider.id);
  };

  const handleSaveProvider = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t('error.title'),
        description: t('error.nameRequired'),
        variant: "destructive",
      });
      return;
    }

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setSaving(true);
    try {
      if (editingProvider) {
        await externalProvidersApi.update(editingProvider.id, formData);
        await externalProvidersApi.assignServices(editingProvider.id, assignedServiceIds);
        toast({
          title: t('success.title'),
          description: t('success.updated'),
        });
      } else {
        const response = await externalProvidersApi.create(formData);
        const newProvider = response.data;
        if (assignedServiceIds.length > 0) {
          await externalProvidersApi.assignServices(newProvider.id, assignedServiceIds);
        }
        toast({
          title: t('success.title'),
          description: t('success.created'),
        });
      }

      setDialogOpen(false);
      fetchData(true);
    } catch (error) {
      console.error("Failed to save provider", error);
      toast({
        title: t('error.title'),
        description: t('error.saveFailed'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (provider: ExternalProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return;

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setDeleting(true);
    try {
      await externalProvidersApi.delete(providerToDelete.id);
      toast({
        title: t('success.title'),
        description: t('success.deleted'),
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      fetchData(true);
    } catch (error) {
      console.error("Failed to delete provider", error);
      toast({
        title: t('error.title'),
        description: t('error.deleteFailed'),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============ Image Upload ============
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('error.title'),
        description: t('error.imageTooLarge'),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, imageBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // ============ Service Assignment ============
  const handleServiceToggle = async (serviceId: string, checked: boolean) => {
    const newServiceIds = checked 
      ? [...assignedServiceIds, serviceId]
      : assignedServiceIds.filter(id => id !== serviceId);
    
    setAssignedServiceIds(newServiceIds);

    // For existing providers, save immediately
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member' && editingMember?.user?.id) {
        // For members, toggle service assignment
        if (checked) {
          await userServiceOptionsApi.assignServiceToMember(editingMember.user.id, { serviceOptionId: serviceId });
        } else {
          await userServiceOptionsApi.removeServiceFromMember(editingMember.user.id, serviceId);
        }
      } else if (editingType === 'external' && editingProvider) {
        // For existing external providers, update all service assignments
        await externalProvidersApi.assignServices(editingProvider.id, newServiceIds);
      }
      // For new external providers (editingProvider is null), just update state - will save on create
    } catch (error) {
      console.error("Failed to toggle service", error);
      // Revert state on error
      setAssignedServiceIds(assignedServiceIds);
      toast({
        title: t('error.title'),
        description: t('error.serviceFailed'),
        variant: "destructive",
      });
    }
  };

  // ============ Availability Operations ============
  const handleAddAvailability = async () => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member' && editingMember?.user?.id) {
        await availabilityApi.createForMember(editingMember.user.id, {
          dayOfWeek: selectedDay,
          startTime: newAvailability.startTime,
          endTime: newAvailability.endTime,
        });
        const res = await availabilityApi.getForMember(editingMember.user.id);
        setProviderAvailability(res.data || []);
      } else if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.createAvailability(editingProvider.id, {
          dayOfWeek: selectedDay,
          startTime: newAvailability.startTime,
          endTime: newAvailability.endTime,
        });
        const res = await externalProvidersApi.getAvailability(editingProvider.id);
        setProviderAvailability(res.data || []);
      }
      
      setAddAvailabilityDialogOpen(false);
      toast({
        title: t('success.title'),
        description: t('availability.added'),
      });
    } catch (error) {
      console.error("Failed to add availability", error);
      toast({
        title: t('error.title'),
        description: t('availability.addFailed'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member') {
        await availabilityApi.deleteAsAdmin(availabilityId);
      } else if (editingProvider) {
        await externalProvidersApi.deleteAvailability(editingProvider.id, availabilityId);
      }
      
      setProviderAvailability(prev => prev.filter(a => a.id !== availabilityId));
      toast({
        title: t('success.title'),
        description: t('availability.deleted'),
      });
    } catch (error) {
      console.error("Failed to delete availability", error);
      toast({
        title: t('error.title'),
        description: t('availability.deleteFailed'),
        variant: "destructive",
      });
    }
  };

  // ============ Blocked Time Operations ============
  const handleAddBlockedTime = async () => {
    if (!newBlockedTime.date) return;

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const data = {
        date: newBlockedTime.date,
        startTime: newBlockedTime.isFullDay ? undefined : newBlockedTime.startTime || undefined,
        endTime: newBlockedTime.isFullDay ? undefined : newBlockedTime.endTime || undefined,
        isFullDay: newBlockedTime.isFullDay,
        reason: newBlockedTime.reason || undefined,
      };

      if (editingType === 'member' && editingMember?.user?.id) {
        await blockedTimesApi.createForMember(editingMember.user.id, data);
        const res = await blockedTimesApi.getForMember(editingMember.user.id);
        setBlockedTimes(res.data || []);
      } else if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.createBlockedTime(editingProvider.id, data);
        const res = await externalProvidersApi.getBlockedTimes(editingProvider.id);
        setBlockedTimes(res.data || []);
      }
      
      setAddBlockedTimeDialogOpen(false);
      setNewBlockedTime({ date: "", startTime: "09:00", endTime: "17:00", isFullDay: true, reason: "" });
      toast({
        title: t('success.title'),
        description: t('blockedTime.added'),
      });
    } catch (error) {
      console.error("Failed to add blocked time", error);
      toast({
        title: t('error.title'),
        description: t('blockedTime.addFailed'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteBlockedTime = async (blockedTimeId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member') {
        await blockedTimesApi.deleteAsAdmin(blockedTimeId);
      } else if (editingProvider) {
        await externalProvidersApi.deleteBlockedTime(editingProvider.id, blockedTimeId);
      }
      
      setBlockedTimes(prev => prev.filter(bt => bt.id !== blockedTimeId));
      toast({
        title: t('success.title'),
        description: t('blockedTime.deleted'),
      });
    } catch (error) {
      console.error("Failed to delete blocked time", error);
      toast({
        title: t('error.title'),
        description: t('blockedTime.deleteFailed'),
        variant: "destructive",
      });
    }
  };

  // ============ Render ============
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Only admins can access this page
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {t('error.adminOnly')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message when no organization is selected
  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {t('error.noOrganization')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const editingName = editingType === 'member' 
    ? `${editingMember?.user?.firstName || ''} ${editingMember?.user?.lastName || ''}`.trim() || 'Member'
    : editingProvider?.name || 'Provider';

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {common('refresh')}
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={handleCreateProvider}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('addProvider')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Unified provider grid - members + external providers */}
          {members.length === 0 && externalProviders.length === 0 ? (
            <EmptyState 
              message={t('empty.description')}
              onCreateClick={isAdmin ? handleCreateProvider : undefined}
              buttonText={isAdmin ? t('addProvider') : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Render members as providers */}
              {members.map((member) => (
                <ProviderCard
                  key={`member-${member.userId}`}
                  provider={{
                    id: member.user?.id || member.id,
                    name: `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || member.user?.email || 'Unknown',
                    imageUrl: member.user?.imageUrl,
                  }}
                  type="member"
                  onEdit={() => handleEditMember(member)}
                />
              ))}
              {/* Render external providers */}
              {externalProviders.map((provider) => (
                <ProviderCard
                  key={`external-${provider.id}`}
                  provider={{
                    id: provider.id,
                    name: provider.name,
                    imageUrl: provider.imageBase64,
                    isActive: provider.isActive,
                  }}
                  type="external"
                  onEdit={() => handleEditProvider(provider)}
                  onDelete={isAdmin ? () => handleDeleteClick(provider) : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingType === 'member' 
                ? `Manage ${editingName}` 
                : (editingProvider ? t('dialog.editTitle') : t('dialog.createTitle'))
              }
            </DialogTitle>
            <DialogDescription>
              {editingType === 'member' 
                ? 'Manage services, availability and blocked times for this provider.'
                : (editingProvider ? t('dialog.editDescription') : t('dialog.createDescription'))
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className={editingType === 'external' ? "grid w-full grid-cols-4" : "grid w-full grid-cols-3"}>
              {editingType === 'external' && (
                <TabsTrigger value="details">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
              )}
              <TabsTrigger value="services" disabled={editingType === 'external' && !editingProvider}>
                <Briefcase className="h-4 w-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger value="availability" disabled={editingType === 'external' && !editingProvider}>
                <Clock className="h-4 w-4 mr-2" />
                Availability
              </TabsTrigger>
              <TabsTrigger value="blocked" disabled={editingType === 'external' && !editingProvider}>
                <CalendarX className="h-4 w-4 mr-2" />
                Blocked Times
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Details Tab (External only) */}
              {editingType === 'external' && (
                <TabsContent value="details" className="mt-0 space-y-4">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {formData.imageBase64 ? (
                        <AvatarImage src={formData.imageBase64} />
                      ) : null}
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <ImageIcon className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        {t('dialog.uploadImage')}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('dialog.imageHint')}
                      </p>
                      {formData.imageBase64 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-destructive"
                          onClick={() => setFormData(prev => ({ ...prev, imageBase64: "" }))}
                        >
                          {t('dialog.removeImage')}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">{t('dialog.name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('dialog.namePlaceholder')}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      {t('dialog.activeLabel')}
                    </Label>
                  </div>
                </TabsContent>
              )}

              {/* Services Tab */}
              <TabsContent value="services" className="mt-0">
                {serviceOptions.length === 0 ? (
                  <Alert>
                    <AlertDescription>{t('services.noServices')}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {/* Header with stats and bulk actions */}
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        {assignedServiceIds.length} of {serviceOptions.length} services assigned
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const allIds = serviceOptions.map(s => s.id);
                            const newIds = allIds.filter(id => !assignedServiceIds.includes(id));
                            setAssignedServiceIds(allIds);
                            
                            const token = await getToken();
                            if (!token || !currentOrganization) return;
                            setAuthToken(token);
                            setOrganizationContext(currentOrganization.id);
                            
                            try {
                              if (editingType === 'external' && editingProvider) {
                                await externalProvidersApi.assignServices(editingProvider.id, allIds);
                              } else if (editingType === 'member' && editingMember?.user?.id) {
                                // Assign new services in parallel
                                await Promise.all(
                                  newIds.map(id => 
                                    userServiceOptionsApi.assignServiceToMember(editingMember.user!.id, { serviceOptionId: id })
                                  )
                                );
                              }
                            } catch (error) {
                              console.error("Failed to bulk assign", error);
                              toast({
                                title: t('error.title'),
                                description: t('error.serviceFailed'),
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={assignedServiceIds.length === serviceOptions.length}
                        >
                          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const currentIds = [...assignedServiceIds];
                            setAssignedServiceIds([]);
                            
                            const token = await getToken();
                            if (!token || !currentOrganization) return;
                            setAuthToken(token);
                            setOrganizationContext(currentOrganization.id);
                            
                            try {
                              if (editingType === 'external' && editingProvider) {
                                await externalProvidersApi.assignServices(editingProvider.id, []);
                              } else if (editingType === 'member' && editingMember?.user?.id) {
                                // Remove all services in parallel
                                await Promise.all(
                                  currentIds.map(id => 
                                    userServiceOptionsApi.removeServiceFromMember(editingMember.user!.id, id)
                                  )
                                );
                              }
                            } catch (error) {
                              console.error("Failed to bulk clear", error);
                              toast({
                                title: t('error.title'),
                                description: t('error.serviceFailed'),
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={assignedServiceIds.length === 0}
                        >
                          <Square className="h-3.5 w-3.5 mr-1.5" />
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Services list */}
                    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                      {serviceOptions
                        .filter(service => 
                          service.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                          service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
                        )
                        .sort((a, b) => {
                          // Show assigned first
                          const aAssigned = assignedServiceIds.includes(a.id);
                          const bAssigned = assignedServiceIds.includes(b.id);
                          if (aAssigned && !bAssigned) return -1;
                          if (!aAssigned && bAssigned) return 1;
                          return a.title.localeCompare(b.title);
                        })
                        .map((service) => {
                          const isAssigned = assignedServiceIds.includes(service.id);
                          return (
                            <div
                              key={service.id}
                              className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-muted/80 ${
                                isAssigned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'
                              }`}
                              onClick={() => handleServiceToggle(service.id, !isAssigned)}
                            >
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={isAssigned}
                                onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm">{service.title}</span>
                              </div>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {service.duration}m
                              </Badge>
                            </div>
                          );
                        })}
                      {serviceOptions.filter(service => 
                        service.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                        service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No services match "{serviceSearch}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="mt-0">
                {availabilityLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('availability.description')}
                    </p>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <AvailabilityRow
                        key={day}
                        day={day}
                        availabilities={providerAvailability}
                        onAdd={() => {
                          setSelectedDay(day);
                          setNewAvailability({ startTime: "09:00", endTime: "17:00" });
                          setAddAvailabilityDialogOpen(true);
                        }}
                        onDelete={handleDeleteAvailability}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Blocked Times Tab */}
              <TabsContent value="blocked" className="mt-0">
                {blockedTimesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t('blockedTime.description')}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddBlockedTimeDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('blockedTime.add')}
                      </Button>
                    </div>

                    {blockedTimes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('blockedTime.empty')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blockedTimes.map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div>
                              <div className="font-medium">
                                {format(parseISO(bt.date), 'EEEE, MMMM d, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {bt.isFullDay ? t('blockedTime.fullDay') : `${bt.startTime?.slice(0, 5)} - ${bt.endTime?.slice(0, 5)}`}
                                {bt.reason && ` - ${bt.reason}`}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBlockedTime(bt.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {editingType === 'member' ? common('close') || 'Close' : common('cancel')}
            </Button>
            {editingType === 'external' && (
              <Button onClick={handleSaveProvider} disabled={saving}>
                {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {editingProvider ? common('save') : common('create')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Availability Dialog */}
      <Dialog open={addAvailabilityDialogOpen} onOpenChange={setAddAvailabilityDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('availability.addTitle')}</DialogTitle>
            <DialogDescription>
              Add working hours for {DAY_NAMES[selectedDay]}
            </DialogDescription>
          </DialogHeader>

          <VisualTimeRangePicker
            startTime={newAvailability.startTime}
            endTime={newAvailability.endTime}
            onTimeChange={(start, end) => setNewAvailability({ startTime: start, endTime: end })}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAvailabilityDialogOpen(false)}>
              {common('cancel')}
            </Button>
            <Button onClick={handleAddAvailability}>
              {t('availability.addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blocked Time Dialog */}
      <Dialog open={addBlockedTimeDialogOpen} onOpenChange={setAddBlockedTimeDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('blockedTime.addTitle')}</DialogTitle>
            <DialogDescription>{t('blockedTime.addDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('blockedTime.date')}</Label>
              <Input
                type="date"
                value={newBlockedTime.date}
                onChange={(e) => setNewBlockedTime(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isFullDay"
                checked={newBlockedTime.isFullDay}
                onCheckedChange={(checked) => setNewBlockedTime(prev => ({ ...prev, isFullDay: checked }))}
              />
              <Label htmlFor="isFullDay">{t('blockedTime.fullDayLabel')}</Label>
            </div>

            {!newBlockedTime.isFullDay && (
              <BlockTimeRangePicker
                startTime={newBlockedTime.startTime}
                endTime={newBlockedTime.endTime}
                onTimeChange={(start, end) => setNewBlockedTime(prev => ({ ...prev, startTime: start, endTime: end }))}
              />
            )}

            <div className="space-y-2">
              <Label>{t('blockedTime.reason')}</Label>
              <Input
                value={newBlockedTime.reason}
                onChange={(e) => setNewBlockedTime(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('blockedTime.reasonPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBlockedTimeDialogOpen(false)}>
              {common('cancel')}
            </Button>
            <Button onClick={handleAddBlockedTime} disabled={!newBlockedTime.date}>
              {t('blockedTime.addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t('delete.description', { name: providerToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {common('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {common('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
