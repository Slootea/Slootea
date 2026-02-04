"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { availabilityApi, serviceOptionsApi, userServiceOptionsApi, blockedTimesApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { Availability, ServiceOption, DayOfWeek, UserServiceOption, BlockedTime } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { 
  Plus, 
  Trash2, 
  Clock, 
  Copy, 
  Calendar, 
  Briefcase, 
  Sunrise, 
  Moon, 
  MoreHorizontal,
  CheckCircle2,
  Zap,
  ChevronDown,
  Info,
  CalendarDays,
  Timer,
  Sun,
  Sunset,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  List,
  ChevronRight,
  Edit3,
  CalendarX,
  Ban,
  CalendarOff
} from "lucide-react";
import { useTranslations } from "next-intl";

// Visual Time Range Picker Component
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

  const getMinutesFromPosition = (clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(x / rect.width, 1));
    return snapToInterval(percent * totalHours * 60);
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
    const minutes = getMinutesFromPosition(e.clientX);
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
    { label: t("presets.morning"), icon: Sunrise, start: "06:00", end: "12:00", color: "text-amber-500" },
    { label: t("presets.afternoon"), icon: Sun, start: "12:00", end: "18:00", color: "text-sky-500" },
    { label: t("presets.evening"), icon: Sunset, start: "18:00", end: "23:00", color: "text-indigo-500" },
    { label: t("presets.fullDay"), icon: Clock, start: "00:00", end: "23:59", color: "text-emerald-500" },
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

      {/* Visual Timeline - matching WeeklyOverview style */}
      <div className="space-y-3 p-4 rounded-xl border bg-card">
        {/* Header with time display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("dialog.dragToSelect")}</p>
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
          {/* Background grid pattern - 24 hours */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour} 
                className={`flex-1 border-r ${
                  hour % 6 === 5 
                    ? 'border-border/40' 
                    : 'border-border/10'
                } last:border-r-0`} 
              />
            ))}
          </div>

          {/* Time period backgrounds */}
          <div className="absolute inset-0 flex pointer-events-none">
            {/* Night (0-6) */}
            <div className="w-1/4 bg-slate-900/5 dark:bg-slate-100/5" />
            {/* Morning (6-12) */}
            <div className="w-1/4 bg-amber-500/5" />
            {/* Afternoon (12-18) */}
            <div className="w-1/4 bg-sky-500/5" />
            {/* Evening (18-24) */}
            <div className="w-1/4 bg-indigo-500/5" />
          </div>

          {/* Selected Range - Matching WeeklyOverview style */}
          <div
            className={`absolute top-2 bottom-2 rounded-md cursor-grab transition-all duration-100 shadow-md hover:shadow-lg ${isDragging === 'range' ? 'cursor-grabbing scale-y-105' : ''}`}
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, 2)}%`,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'range')}
            onTouchStart={(e) => handleMouseDown(e, 'range')}
          >
            {/* Inner highlight */}
            <div className="absolute inset-0 rounded-md bg-gradient-to-b from-white/25 to-transparent" />
            {/* Time label inside if wide enough */}
            {widthPercent > 15 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-sm">
                  {startTime} – {endTime}
                </span>
              </div>
            )}
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
            <span>{t("periods.morning")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sun className="h-3 w-3 text-sky-500" />
            <span>{t("periods.afternoon")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset className="h-3 w-3 text-indigo-500" />
            <span>{t("periods.evening")}</span>
          </div>
        </div>
      </div>

      {/* Manual Time Input */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime" className="text-xs font-medium">{t("dialog.startTime")}</Label>
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
          <Label htmlFor="endTime" className="text-xs font-medium">{t("dialog.endTime")}</Label>
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

// Block Time Range Picker Component (similar to VisualTimeRangePicker but with amber theme)
function BlockTimeRangePicker({
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
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);

  const totalHours = 24;
  const snapInterval = 15; // Snap to 15-minute intervals

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

  // Handle click on empty space to move the bar
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
            <p className="text-sm font-medium">{t("dialog.dragToSelect")}</p>
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
          <div className="w-[25%] bg-slate-800/5 dark:bg-slate-300/5" /> {/* Night 0-6 */}
          <div className="w-[25%] bg-amber-500/5" /> {/* Morning 6-12 */}
          <div className="w-[25%] bg-sky-500/5" /> {/* Afternoon 12-18 */}
          <div className="w-[25%] bg-indigo-500/5" /> {/* Evening 18-24 */}
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

      {/* Manual time inputs */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dialog.startTime")}</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => {
              const newStartMins = timeToMinutes(e.target.value);
              if (newStartMins < endMinutes) {
                onTimeChange(e.target.value, endTime);
              }
            }}
            className="h-9 font-mono text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dialog.endTime")}</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => {
              const newEndMins = timeToMinutes(e.target.value);
              if (newEndMins > startMinutes) {
                onTimeChange(startTime, e.target.value);
              }
            }}
            className="h-9 font-mono text-center"
          />
        </div>
      </div>
    </div>
  );
}

// Schedule templates
const SCHEDULE_TEMPLATES = {
  standard: {
    name: "Standard (9-5)",
    icon: Briefcase,
    slots: [{ startTime: "09:00", endTime: "17:00" }],
    days: [0, 1, 2, 3, 4],
  },
  morning: {
    name: "Morning Hours",
    icon: Sunrise,
    slots: [{ startTime: "06:00", endTime: "12:00" }],
    days: [0, 1, 2, 3, 4],
  },
  evening: {
    name: "Evening Hours",
    icon: Moon,
    slots: [{ startTime: "17:00", endTime: "21:00" }],
    days: [0, 1, 2, 3, 4],
  },
  splitShift: {
    name: "Split Shift",
    icon: Clock,
    slots: [
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "18:00" },
    ],
    days: [0, 1, 2, 3, 4],
  },
  fullWeek: {
    name: "Full Week",
    icon: Calendar,
    slots: [{ startTime: "09:00", endTime: "17:00" }],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
};

// Weekly Overview Timeline Component
function WeeklyOverview({ 
  groupedByDay, 
  dayNumbers,
  todayDayOfWeek,
  onAddSlot,
  onEditSlot,
  onOpenEditDialog,
  onOpenBlockTimeDialog,
  onApplyTemplate,
  onClearAll
}: { 
  groupedByDay: Record<DayOfWeek, Availability[]>;
  dayNumbers: DayOfWeek[];
  todayDayOfWeek: number;
  onAddSlot: (day: DayOfWeek) => void;
  onEditSlot: (slot: Availability) => void;
  onOpenEditDialog: () => void;
  onOpenBlockTimeDialog: () => void;
  onApplyTemplate: (templateKey: keyof typeof SCHEDULE_TEMPLATES) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("availability");
  
  const timeToPercent = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return ((h * 60 + m) / (24 * 60)) * 100;
  };

  // Calculate total hours for the week
  const totalWeeklyHours = useMemo(() => {
    return dayNumbers.reduce((total, day) => {
      const slots = groupedByDay[day] || [];
      const activeSlots = slots.filter(s => s.isActive);
      return total + activeSlots.reduce((dayTotal, slot) => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        return dayTotal + (endH * 60 + endM - startH * 60 - startM) / 60;
      }, 0);
    }, 0);
  }, [groupedByDay, dayNumbers]);

  // Calculate hours per day for bar comparison
  const hoursPerDay = useMemo(() => {
    return dayNumbers.map(day => {
      const slots = groupedByDay[day] || [];
      const activeSlots = slots.filter(s => s.isActive);
      return activeSlots.reduce((total, slot) => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        return total + (endH * 60 + endM - startH * 60 - startM) / 60;
      }, 0);
    });
  }, [groupedByDay, dayNumbers]);

  const maxHoursInDay = Math.max(...hoursPerDay, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{t("weeklyOverview") || "Weekly Overview"}</CardTitle>
              <CardDescription className="text-sm">{t("weeklyOverviewDesc") || "Your availability at a glance"}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <span>Available</span>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {totalWeeklyHours.toFixed(1)}h/week
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("quickSetup")}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {Object.entries(SCHEDULE_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  return (
                    <DropdownMenuItem key={key} onClick={() => onApplyTemplate(key as keyof typeof SCHEDULE_TEMPLATES)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {t(`templates.${key}`)}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onClearAll}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("clearAll")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAddSlot(todayDayOfWeek as DayOfWeek)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addTimeSlot")}</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={onOpenBlockTimeDialog}
              className="gap-1.5 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:border-amber-700 dark:hover:bg-amber-950/50"
            >
              <CalendarOff className="h-4 w-4" />
              <span className="hidden sm:inline">{t("blockTime") || "Block Time"}</span>
            </Button>
            <Button 
              size="sm"
              onClick={onOpenEditDialog}
              className="gap-1.5"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editSchedule") || "Edit Schedule"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-5">
        <div className="space-y-1">
          {/* Time header */}
          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground mb-2 px-1">
            <div className="w-16 sm:w-24 shrink-0"></div>
            <div className="flex-1 flex justify-between pr-1">
              <span className="tabular-nums">00:00</span>
              <span className="tabular-nums hidden sm:inline">06:00</span>
              <span className="tabular-nums">12:00</span>
              <span className="tabular-nums hidden sm:inline">18:00</span>
              <span className="tabular-nums">24:00</span>
            </div>
            <div className="w-14 shrink-0 text-right hidden sm:block">Hours</div>
          </div>
          
          {dayNumbers.map((day, idx) => {
            const slots = groupedByDay[day] || [];
            const activeSlots = slots.filter(s => s.isActive);
            const isWeekend = day === 5 || day === 6;
            const isToday = day === todayDayOfWeek;
            const dayHours = hoursPerDay[idx];
            
            return (
              <div 
                key={day} 
                className={`
                  flex items-center gap-3 py-1.5 px-1 rounded-lg transition-all
                  ${isToday ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}
                  ${isWeekend && !isToday ? 'opacity-60' : ''}
                `}
              >
                <div className="w-16 sm:w-24 shrink-0 flex items-center gap-2">
                  {isToday && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse hidden sm:block" />
                  )}
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : isWeekend ? 'text-muted-foreground' : ''}`}>
                    <span className="sm:hidden">{t(`dayOfWeek.${day}`).slice(0, 2)}</span>
                    <span className="hidden sm:inline">{t(`dayOfWeek.${day}`).slice(0, 3)}</span>
                  </span>
                </div>
                <div className="flex-1 relative h-9 bg-gradient-to-r from-muted/60 to-muted/40 rounded-md overflow-hidden border border-border/40">
                  {/* Background grid pattern */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div 
                        key={hour} 
                        className={`flex-1 border-r ${
                          hour % 6 === 5 
                            ? 'border-border/40' 
                            : 'border-border/10'
                        } last:border-r-0`} 
                      />
                    ))}
                  </div>
                  
                  {/* Time period backgrounds */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {/* Night (0-6) */}
                    <div className="w-1/4 bg-slate-900/5 dark:bg-slate-100/5" />
                    {/* Morning (6-12) */}
                    <div className="w-1/4 bg-amber-500/5" />
                    {/* Afternoon (12-18) */}
                    <div className="w-1/4 bg-sky-500/5" />
                    {/* Evening (18-24) */}
                    <div className="w-1/4 bg-indigo-500/5" />
                  </div>
                  
                  {/* Availability slots */}
                  {activeSlots.map((slot) => {
                    const leftPercent = timeToPercent(slot.startTime);
                    const widthPercent = timeToPercent(slot.endTime) - leftPercent;
                    
                    return (
                      <TooltipProvider key={slot.id} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onEditSlot(slot)}
                              className="absolute top-1 bottom-1 rounded-[4px] cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:scale-y-110 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                              style={{
                                left: `${leftPercent}%`,
                                width: `${Math.max(widthPercent, 1)}%`,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                              }}
                            >
                              {/* Inner highlight */}
                              <div className="absolute inset-0 rounded-[4px] bg-gradient-to-b from-white/20 to-transparent" />
                              {/* Show time if slot is wide enough */}
                              {widthPercent > 12 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[9px] font-medium text-white drop-shadow-sm truncate px-1">
                                    {slot.startTime}
                                  </span>
                                </div>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs p-3 shadow-lg">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">{slot.startTime} - {slot.endTime}</p>
                              {slot.serviceOption && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {slot.serviceOption.title}
                                </p>
                              )}
                              <p className="text-muted-foreground/70 text-[10px]">
                                {(() => {
                                  const [startH, startM] = slot.startTime.split(':').map(Number);
                                  const [endH, endM] = slot.endTime.split(':').map(Number);
                                  const duration = (endH * 60 + endM - startH * 60 - startM) / 60;
                                  return `${duration.toFixed(1)} hours`;
                                })()}
                              </p>
                              <p className="text-primary text-[10px] font-medium pt-1 border-t border-border/50 mt-1">
                                Click to edit
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                  
                  {/* No availability indicator - clickable to add */}
                  {activeSlots.length === 0 && (
                    <button
                      onClick={() => onAddSlot(day)}
                      className="absolute inset-0 flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors group"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground font-medium transition-colors">Add slot</span>
                    </button>
                  )}
                  
                  {/* Current time indicator if today */}
                  {isToday && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] z-20"
                      style={{ left: `${timeToPercent(new Date().toTimeString().slice(0, 5))}%` }}
                    >
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                    </div>
                  )}
                </div>
                {/* Hours indicator */}
                <div className="w-14 shrink-0 text-right hidden sm:block">
                  <span className={`
                    text-xs font-medium tabular-nums
                    ${dayHours > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'}
                  `}>
                    {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Time period legend */}
          <div className="flex items-center gap-3 pt-3 mt-2 border-t text-[10px] text-muted-foreground justify-center">
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
      </CardContent>
    </Card>
  );
}

// Compact Time Slot Row for List View
function TimeSlotRow({ 
  slot, 
  dayName,
  onToggle, 
  onDelete, 
  onEdit,
}: { 
  slot: Availability;
  dayName: string;
  onToggle: () => void; 
  onDelete: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("availability");
  
  return (
    <div
      className={`
        group flex items-center gap-4 px-4 py-3 border-b last:border-b-0
        transition-all duration-200 hover:bg-muted/50
        ${!slot.isActive && "opacity-60"}
      `}
    >
      <div className="w-24 shrink-0">
        <span className="text-sm font-medium">{dayName}</span>
      </div>
      
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{slot.startTime} - {slot.endTime}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <Badge variant="outline" className="text-xs truncate">
          {slot.serviceOption?.title || t("allServices")}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={slot.isActive}
                  onCheckedChange={onToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {slot.isActive ? t("disable") : t("enable")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onEdit}
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Time slot component for grid view
function TimeSlotCard({ 
  slot, 
  onToggle, 
  onDelete, 
  onEdit,
}: { 
  slot: Availability; 
  onToggle: () => void; 
  onDelete: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("availability");
  
  return (
    <div
      className={`
        group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border
        transition-all duration-200 hover:shadow-sm
        ${slot.isActive 
          ? "bg-card border-border hover:border-primary/30" 
          : "bg-muted/50 border-border/50 opacity-60"
        }
      `}
    >
      <button
        onClick={onEdit}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className={`
          flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0
          ${slot.isActive 
            ? "bg-primary/10 text-primary" 
            : "bg-muted text-muted-foreground"
          }
        `}>
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm tabular-nums">
            {slot.startTime} – {slot.endTime}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {slot.serviceOption?.title || t("allServices")}
          </p>
        </div>
      </button>
      
      <div className="flex items-center gap-1.5">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={slot.isActive}
                  onCheckedChange={onToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {slot.isActive ? t("disable") : t("enable")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Day card component with improved design
function DayCard({ 
  day, 
  dayName, 
  slots, 
  onAddSlot, 
  onToggleSlot, 
  onDeleteSlot,
  onEditSlot,
  onCopyDay,
  isWeekend,
  isToday
}: {
  day: DayOfWeek;
  dayName: string;
  slots: Availability[];
  onAddSlot: (day: DayOfWeek) => void;
  onToggleSlot: (slot: Availability) => void;
  onDeleteSlot: (id: string) => void;
  onEditSlot: (slot: Availability) => void;
  onCopyDay: (fromDay: DayOfWeek) => void;
  isWeekend: boolean;
  isToday: boolean;
}) {
  const t = useTranslations("availability");
  const activeSlots = slots.filter(s => s.isActive);
  const hasSlots = slots.length > 0;
  
  const totalHours = useMemo(() => {
    return activeSlots.reduce((total, slot) => {
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return total + hours;
    }, 0);
  }, [activeSlots]);

  return (
    <Card className={`
      overflow-hidden transition-all duration-200
      ${isWeekend ? "bg-muted/20" : ""}
      ${isToday ? "ring-2 ring-primary/50 shadow-md" : ""}
    `}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm
              ${isToday 
                ? "bg-primary text-primary-foreground" 
                : isWeekend 
                  ? "bg-muted text-muted-foreground" 
                  : "bg-muted/80 text-foreground"
              }
            `}>
              {dayName.slice(0, 2)}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{dayName}</CardTitle>
              {activeSlots.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {activeSlots.length} {activeSlots.length === 1 ? 'slot' : 'slots'} • {totalHours.toFixed(1)}h
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("noAvailability") || "Not available"}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddSlot(day)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addSlotToDay")}
              </DropdownMenuItem>
              {hasSlots && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCopyDay(day)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("copyToOtherDays")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {!hasSlots ? (
          <button
            onClick={() => onAddSlot(day)}
            className="w-full py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground rounded-lg border-2 border-dashed border-muted hover:border-primary/50 hover:bg-muted/30 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{t("clickToAdd")}</span>
          </button>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                onToggle={() => onToggleSlot(slot)}
                onDelete={() => onDeleteSlot(slot.id)}
                onEdit={() => onEditSlot(slot)}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-transparent hover:border-muted"
              onClick={() => onAddSlot(day)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("addMore")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Overview skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Stats card with improved design
function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  color,
  bgColor
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AvailabilityPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("availability");
  const tBlocks = useTranslations("blocksPage");
  const tCommon = useTranslations("common");
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [assignedServices, setAssignedServices] = useState<UserServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [blockTimeDialogOpen, setBlockTimeDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null);
  const [copyFromDay, setCopyFromDay] = useState<DayOfWeek | null>(null);
  const [selectedCopyDays, setSelectedCopyDays] = useState<DayOfWeek[]>([]);
  const [formData, setFormData] = useState({
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: "09:00",
    endTime: "17:00",
    serviceOptionId: "",
  });
  const [blockFormData, setBlockFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    isFullDay: false,
    reason: "",
  });
  const [editingBlockTime, setEditingBlockTime] = useState<BlockedTime | null>(null);
  const [blockTimeTab, setBlockTimeTab] = useState<"add" | "manage">("add");

  const isOrgMember = !!(currentOrganization && userRole === 'member');

  const availableServicesForSelection = useMemo(() => {
    if (isOrgMember) {
      return assignedServices
        .filter(as => as.isActive && as.serviceOption)
        .map(as => as.serviceOption!);
    }
    return serviceOptions;
  }, [isOrgMember, assignedServices, serviceOptions]);

  const hasNoAssignedServices = isOrgMember && availableServicesForSelection.length === 0;

  const fetchData = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);

    if (currentOrganization) {
      setOrganizationContext(currentOrganization.id);
    }

    try {
      const requests: Promise<any>[] = [
        availabilityApi.getAll(),
        blockedTimesApi.getAll(),
      ];

      if (currentOrganization) {
        requests.push(serviceOptionsApi.getAllForOrganization());
        requests.push(userServiceOptionsApi.getMyServices());
      } else {
        requests.push(serviceOptionsApi.getAll());
      }

      const results = await Promise.all(requests);
      
      setAvailabilities(results[0].data);
      setBlockedTimes(results[1].data);
      setServiceOptions(results[2].data);
      
      if (results[3]) {
        setAssignedServices(results[3].data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, currentOrganization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedByDay = useMemo(() => {
    return availabilities.reduce((acc, av) => {
      if (!acc[av.dayOfWeek]) acc[av.dayOfWeek] = [];
      acc[av.dayOfWeek].push(av);
      acc[av.dayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    }, {} as Record<DayOfWeek, Availability[]>);
  }, [availabilities]);

  const stats = useMemo(() => {
    const activeSlots = availabilities.filter(a => a.isActive);
    const daysWithAvailability = new Set(activeSlots.map(a => a.dayOfWeek)).size;
    const totalHours = activeSlots.reduce((total, slot) => {
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      return total + (endH * 60 + endM - startH * 60 - startM) / 60;
    }, 0);
    return { activeSlots: activeSlots.length, daysWithAvailability, totalHours };
  }, [availabilities]);

  // Blocked times stats
  const upcomingBlockedTimes = useMemo(() => {
    return blockedTimes
      .filter((bt) => new Date(bt.date) >= new Date(new Date().toDateString()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [blockedTimes]);

  // Get current day of week (Monday = 0)
  const todayDayOfWeek = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1; // Convert JS day (Sunday=0) to our format (Monday=0)
  }, []);

  const handleCreate = async () => {
    try {
      if (editingSlot) {
        await availabilityApi.update(editingSlot.id, {
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });
        toast({ title: t("messages.updated") });
      } else {
        await availabilityApi.create({
          ...formData,
          serviceOptionId: formData.serviceOptionId || undefined,
        });
        toast({ title: t("messages.created") });
      }
      setDialogOpen(false);
      setEditingSlot(null);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: editingSlot ? t("messages.updateError") : t("messages.createError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await availabilityApi.delete(id);
      toast({ title: t("messages.deleted") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteError"),
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (availability: Availability) => {
    try {
      await availabilityApi.update(availability.id, {
        isActive: !availability.isActive,
      });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleAddSlotToDay = (day: DayOfWeek) => {
    setEditingSlot(null);
    const defaultServiceId = isOrgMember && availableServicesForSelection.length > 0
      ? availableServicesForSelection[0].id
      : "";
    setFormData({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      serviceOptionId: defaultServiceId,
    });
    setDialogOpen(true);
  };

  const handleEditSlot = (slot: Availability) => {
    setEditingSlot(slot);
    setFormData({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      serviceOptionId: slot.serviceOptionId || "",
    });
    setDialogOpen(true);
  };

  const handleApplyTemplate = async (templateKey: keyof typeof SCHEDULE_TEMPLATES) => {
    const template = SCHEDULE_TEMPLATES[templateKey];
    const newSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    
    template.days.forEach((day) => {
      template.slots.forEach((slot) => {
        newSlots.push({
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      });
    });

    try {
      await availabilityApi.deleteAll();
      await availabilityApi.createBulk({ availabilities: newSlots });
      toast({ title: t("messages.templateApplied") });
      setTemplateDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.templateError"),
        variant: "destructive",
      });
    }
  };

  const handleCopyDay = (fromDay: DayOfWeek) => {
    setCopyFromDay(fromDay);
    setSelectedCopyDays([]);
    setCopyDialogOpen(true);
  };

  const handleConfirmCopyDay = async () => {
    if (copyFromDay === null || selectedCopyDays.length === 0) return;
    
    const slotsToCopy = groupedByDay[copyFromDay] || [];
    const newSlots = selectedCopyDays.flatMap((targetDay) =>
      slotsToCopy.map((slot) => ({
        dayOfWeek: targetDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
        serviceOptionId: slot.serviceOptionId,
      }))
    );

    try {
      await availabilityApi.createBulk({ availabilities: newSlots });
      toast({ title: t("messages.slotsCopied") });
      setCopyDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.copyError"),
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await availabilityApi.deleteAll();
      toast({ title: t("messages.clearedAll") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.clearError"),
        variant: "destructive",
      });
    }
  };

  // Block time handlers
  const handleCreateBlockTime = async () => {
    try {
      const payload: any = {
        date: blockFormData.date,
        isFullDay: blockFormData.isFullDay,
        reason: blockFormData.reason || undefined,
      };
      
      if (!blockFormData.isFullDay) {
        payload.startTime = blockFormData.startTime;
        payload.endTime = blockFormData.endTime;
      }

      if (editingBlockTime) {
        await blockedTimesApi.update(editingBlockTime.id, payload);
        toast({ title: tBlocks("messages.updated") || "Blocked time updated" });
      } else {
        await blockedTimesApi.create(payload);
        toast({ title: tBlocks("messages.created") });
      }
      
      resetBlockForm();
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: editingBlockTime 
          ? (tBlocks("messages.updateError") || "Failed to update blocked time")
          : tBlocks("messages.createError"),
        variant: "destructive",
      });
    }
  };

  const handleEditBlockTime = (bt: BlockedTime) => {
    setEditingBlockTime(bt);
    setBlockFormData({
      date: bt.date.split('T')[0], // Handle ISO date format
      startTime: bt.startTime || "09:00",
      endTime: bt.endTime || "17:00",
      isFullDay: bt.isFullDay,
      reason: bt.reason || "",
    });
    setBlockTimeTab("add");
  };

  const resetBlockForm = () => {
    setEditingBlockTime(null);
    setBlockFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      isFullDay: false,
      reason: "",
    });
  };

  const handleDeleteBlockTime = async (id: string) => {
    try {
      await blockedTimesApi.delete(id);
      toast({ title: tBlocks("messages.deleted") });
      fetchData();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tBlocks("messages.deleteError"),
        variant: "destructive",
      });
    }
  };

  // Grouped blocked times for management tab
  const groupedBlockedTimes = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = blockedTimes
      .filter((bt) => new Date(bt.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const past = blockedTimes
      .filter((bt) => new Date(bt.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return { upcoming, past };
  }, [blockedTimes]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const dayNumbers = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];

  return (
    <div className="space-y-6">
      {/* Alert for members with no assigned services */}
      {hasNoAssignedServices && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            {t("noAssignedServicesAlert")}
          </AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      {availabilities.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground max-w-2xl">
            {isOrgMember ? t("descriptionMember") : t("description")}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {availabilities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            icon={CheckCircle2}
            label={t("activeSlots")}
            value={stats.activeSlots}
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-100 dark:bg-emerald-950"
          />
          <StatsCard
            icon={CalendarDays}
            label={t("daysConfigured")}
            value={`${stats.daysWithAvailability}/7`}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-100 dark:bg-blue-950"
          />
          <StatsCard
            icon={Timer}
            label={t("hoursPerWeek")}
            value={`${stats.totalHours.toFixed(1)}h`}
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100 dark:bg-purple-950"
          />
        </div>
      )}

      {/* Empty State */}
      {availabilities.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-6">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("emptyState.title")}</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              {t("emptyState.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setTemplateDialogOpen(true)} variant="outline" size="lg">
                <Zap className="h-4 w-4 mr-2" />
                {t("useTemplate")}
              </Button>
              <Button onClick={() => handleAddSlotToDay(DayOfWeek.MONDAY)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t("addManually")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Overview */}
      {availabilities.length > 0 && (
        <WeeklyOverview 
          groupedByDay={groupedByDay} 
          dayNumbers={dayNumbers} 
          todayDayOfWeek={todayDayOfWeek}
          onAddSlot={handleAddSlotToDay}
          onEditSlot={handleEditSlot}
          onOpenEditDialog={() => setEditScheduleDialogOpen(true)}
          onOpenBlockTimeDialog={() => setBlockTimeDialogOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onClearAll={handleClearAll}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSlot(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSlot ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingSlot ? t("dialog.editTitle") : t("dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {editingSlot ? t("dialog.editDescription") : t("dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Day selector with visual pills */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dialog.dayOfWeek")}</Label>
              <div className="flex flex-wrap gap-2">
                {dayNumbers.map((value) => {
                  const isSelected = formData.dayOfWeek === value;
                  const isWeekend = value === 5 || value === 6;
                  return (
                    <button
                      key={value}
                      onClick={() => setFormData({ ...formData, dayOfWeek: value })}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-all border
                        ${isSelected 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : isWeekend
                            ? "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-muted"
                            : "bg-background text-foreground border-border hover:bg-muted hover:border-muted"
                        }
                      `}
                    >
                      {t(`dayOfWeek.${value}`).slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Visual Time Range Picker */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dialog.selectTime")}</Label>
              <VisualTimeRangePicker
                startTime={formData.startTime}
                endTime={formData.endTime}
                onTimeChange={(start, end) => setFormData({ ...formData, startTime: start, endTime: end })}
              />
            </div>

            {/* Service selector */}
            {!editingSlot && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("dialog.service")}</Label>
                  {isOrgMember && availableServicesForSelection.length === 0 ? (
                    <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-400">
                        {t("noAssignedServices")}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Select
                        value={formData.serviceOptionId || "__all__"}
                        onValueChange={(v) =>
                          setFormData({ ...formData, serviceOptionId: v === "__all__" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={tCommon("allServices")} />
                        </SelectTrigger>
                        <SelectContent>
                          {!isOrgMember && (
                            <SelectItem value="__all__">{tCommon("allServices")}</SelectItem>
                          )}
                          {availableServicesForSelection.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {isOrgMember 
                          ? t("dialog.serviceHintMember")
                          : t("dialog.serviceHint")
                        }
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSlot(null); }}>
              {tCommon("cancel")}
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isOrgMember && !editingSlot && !formData.serviceOptionId}
            >
              {editingSlot ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t("templateDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("templateDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 py-4 pr-4">
              {Object.entries(SCHEDULE_TEMPLATES).map(([key, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleApplyTemplate(key as keyof typeof SCHEDULE_TEMPLATES)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="rounded-lg bg-muted p-3 group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{t(`templates.${key}`)}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {template.slots.map(s => `${s.startTime} - ${s.endTime}`).join(", ")}
                        {" • "}
                        {template.days.length === 7 ? t("allDays") : t("weekdays")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Copy Day Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              {t("copyDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("copyDialog.description", { day: copyFromDay !== null ? t(`dayOfWeek.${copyFromDay}`) : "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {dayNumbers
              .filter((d) => d !== copyFromDay)
              .map((day) => {
                const isSelected = selectedCopyDays.includes(day);
                const isWeekend = day === 5 || day === 6;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCopyDays(selectedCopyDays.filter((d) => d !== day));
                      } else {
                        setSelectedCopyDays([...selectedCopyDays, day]);
                      }
                    }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${isSelected 
                        ? "bg-primary/10 border-primary text-primary" 
                        : isWeekend
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${isSelected 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/30"
                      }
                    `}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="font-medium">{t(`dayOfWeek.${day}`)}</span>
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button 
              onClick={handleConfirmCopyDay}
              disabled={selectedCopyDays.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("copyDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              {t("editSchedule") || "Edit Schedule"}
            </DialogTitle>
            <DialogDescription>
              {t("editScheduleDesc") || "Manage your weekly availability schedule"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {dayNumbers.map((day) => {
                const slots = groupedByDay[day] || [];
                const isWeekend = day === 5 || day === 6;
                const isToday = day === todayDayOfWeek;
                const activeSlots = slots.filter(s => s.isActive);
                const totalHours = activeSlots.reduce((total, slot) => {
                  const [startH, startM] = slot.startTime.split(":").map(Number);
                  const [endH, endM] = slot.endTime.split(":").map(Number);
                  return total + (endH * 60 + endM - startH * 60 - startM) / 60;
                }, 0);

                return (
                  <div 
                    key={day} 
                    className={`
                      rounded-lg border p-4 transition-all
                      ${isToday ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
                      ${isWeekend && !isToday ? 'bg-muted/30' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm
                          ${isToday 
                            ? "bg-primary text-primary-foreground" 
                            : isWeekend 
                              ? "bg-muted text-muted-foreground" 
                              : "bg-muted/80 text-foreground"
                          }
                        `}>
                          {t(`dayOfWeek.${day}`).slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{t(`dayOfWeek.${day}`)}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeSlots.length > 0 
                              ? `${activeSlots.length} ${activeSlots.length === 1 ? 'slot' : 'slots'} • ${totalHours.toFixed(1)}h`
                              : t("noAvailability") || "Not available"
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {slots.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyDay(day)}
                            className="text-muted-foreground"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            {t("copy")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditScheduleDialogOpen(false);
                            handleAddSlotToDay(day);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t("addSlot") || "Add"}
                        </Button>
                      </div>
                    </div>
                    
                    {slots.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                        {t("noSlotsForDay") || "No time slots configured"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`
                              flex items-center justify-between gap-3 p-3 rounded-lg border
                              ${slot.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                p-2 rounded-lg
                                ${slot.isActive ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-muted'}
                              `}>
                                <Clock className={`h-4 w-4 ${slot.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <p className="font-mono font-medium">
                                  {slot.startTime} – {slot.endTime}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {slot.serviceOption?.title || t("allServices")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Switch
                                        checked={slot.isActive}
                                        onCheckedChange={() => handleToggleActive(slot)}
                                        className="data-[state=checked]:bg-emerald-500"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {slot.isActive ? t("disable") : t("enable")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditScheduleDialogOpen(false);
                                  handleEditSlot(slot);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditScheduleDialogOpen(false)}>
              {tCommon("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Time Dialog */}
      <Dialog open={blockTimeDialogOpen} onOpenChange={(open) => {
        setBlockTimeDialogOpen(open);
        if (!open) {
          resetBlockForm();
          setBlockTimeTab("add");
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <CalendarOff className="h-5 w-5" />
              {tBlocks("title") || "Block Time"}
            </DialogTitle>
            <DialogDescription>
              {tBlocks("description") || "Block specific dates and times when you're not available for appointments."}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={blockTimeTab} onValueChange={(v) => setBlockTimeTab(v as "add" | "manage")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="add" className="gap-2">
                <Plus className="h-4 w-4" />
                {editingBlockTime ? (tCommon("edit") || "Edit") : (tBlocks("addBlock") || "Add Block")}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <List className="h-4 w-4" />
                {tBlocks("manageBlocks") || "Manage Blocks"}
                {blockedTimes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {blockedTimes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Add/Edit Tab */}
            <TabsContent value="add" className="flex-1 overflow-y-auto mt-0 space-y-6 pr-1">
              {editingBlockTime && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {tBlocks("editingBlock") || "Editing blocked time"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetBlockForm}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              )}

              {/* Quick date selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{tBlocks("date") || "Select Date"}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const dateObj = addDays(new Date(), i);
                    const dateStr = format(dateObj, "yyyy-MM-dd");
                    const isSelected = blockFormData.date === dateStr;
                    const dayName = format(dateObj, "EEE");
                    const dayNum = format(dateObj, "d");
                    const isToday = i === 0;
                    
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setBlockFormData({ ...blockFormData, date: dateStr })}
                        className={`
                          flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                          ${isSelected 
                            ? "bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-sm" 
                            : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                          }
                        `}
                      >
                        <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {isToday ? (tCommon("today") || "Today") : dayName}
                        </span>
                        <span className={`text-lg font-bold ${isSelected ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Custom date input */}
                <div className="flex items-center gap-2 pt-2">
                  <Label className="text-sm text-muted-foreground shrink-0">{tBlocks("orSelectDate") || "Or select:"}</Label>
                  <Input
                    type="date"
                    value={blockFormData.date}
                    onChange={(e) => setBlockFormData({ ...blockFormData, date: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <Separator />

              {/* Full day toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                    <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">{tBlocks("fullDay") || "Block Entire Day"}</p>
                    <p className="text-xs text-muted-foreground">{tBlocks("fullDayDesc") || "No appointments will be available"}</p>
                  </div>
                </div>
                <Switch
                  checked={blockFormData.isFullDay}
                  onCheckedChange={(checked) => setBlockFormData({ ...blockFormData, isFullDay: checked })}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {/* Time range selector - only show if not full day */}
              {!blockFormData.isFullDay && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">{tBlocks("timeRange") || "Time Range to Block"}</Label>
                  <BlockTimeRangePicker
                    startTime={blockFormData.startTime}
                    endTime={blockFormData.endTime}
                    onTimeChange={(start, end) => setBlockFormData({ ...blockFormData, startTime: start, endTime: end })}
                  />
                </div>
              )}

              <Separator />

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{tBlocks("reason") || "Reason (Optional)"}</Label>
                <Textarea
                  placeholder={tBlocks("reasonPlaceholder") || "e.g., Vacation, Meeting, Personal time..."}
                  value={blockFormData.reason}
                  onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Action button at bottom of add tab */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleCreateBlockTime}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {editingBlockTime 
                    ? (tBlocks("updateBlock") || "Update Block") 
                    : (tBlocks("blockTime") || "Block Time")
                  }
                </Button>
              </div>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="flex-1 overflow-y-auto mt-0 pr-1">
              {blockedTimes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <CalendarOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{tBlocks("empty.title") || "No blocked times"}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tBlocks("empty.description") || "You haven't blocked any times yet."}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setBlockTimeTab("add")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {tBlocks("addFirst") || "Add your first block"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upcoming Blocked Times */}
                  {groupedBlockedTimes.upcoming.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{tBlocks("upcomingBlocked") || "Upcoming"}</h3>
                        <Badge variant="secondary" className="text-xs">{groupedBlockedTimes.upcoming.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedBlockedTimes.upcoming.map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 shrink-0">
                                <CalendarX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {format(parseISO(bt.date), "EEEE, MMMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bt.isFullDay 
                                    ? (tBlocks("allDay") || "All day") 
                                    : `${bt.startTime} – ${bt.endTime}`
                                  }
                                  {bt.reason && ` • ${bt.reason}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleEditBlockTime(bt)}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{tCommon("edit")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteBlockTime(bt.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{tCommon("delete")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Blocked Times */}
                  {groupedBlockedTimes.past.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-muted-foreground">{tBlocks("pastBlocked") || "Past"}</h3>
                        <Badge variant="outline" className="text-xs">{groupedBlockedTimes.past.length}</Badge>
                      </div>
                      <div className="space-y-2 opacity-60">
                        {groupedBlockedTimes.past.slice(0, 10).map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-muted shrink-0">
                                <CalendarX className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {format(parseISO(bt.date), "EEEE, MMMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bt.isFullDay 
                                    ? (tBlocks("allDay") || "All day") 
                                    : `${bt.startTime} – ${bt.endTime}`
                                  }
                                  {bt.reason && ` • ${bt.reason}`}
                                </p>
                              </div>
                            </div>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteBlockTime(bt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{tCommon("delete")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))}
                        {groupedBlockedTimes.past.length > 10 && (
                          <p className="text-xs text-center text-muted-foreground pt-2">
                            +{groupedBlockedTimes.past.length - 10} {tBlocks("moreBlocks") || "more"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setBlockTimeDialogOpen(false)}>
              {tCommon("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
