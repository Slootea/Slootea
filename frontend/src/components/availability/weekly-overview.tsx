"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Availability, DayOfWeek } from "@/lib/types";
import { useTranslations } from "next-intl";
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  Sunrise, 
  Moon, 
  ChevronDown,
  CalendarDays,
  Sun,
  Sunset,
  Sparkles,
  Edit3,
  CalendarOff,
  Clock,
  Calendar
} from "lucide-react";
import { SCHEDULE_TEMPLATES, ScheduleTemplateKey } from "./schedule-templates";

interface WeeklyOverviewProps {
  groupedByDay: Record<DayOfWeek, Availability[]>;
  dayNumbers: DayOfWeek[];
  todayDayOfWeek: number;
  onAddSlot: (day: DayOfWeek) => void;
  onEditSlot: (slot: Availability) => void;
  onOpenEditDialog: () => void;
  onOpenBlockTimeDialog: () => void;
  onApplyTemplate: (templateKey: ScheduleTemplateKey) => void;
  onClearAll: () => void;
}

export function WeeklyOverview({ 
  groupedByDay, 
  dayNumbers,
  todayDayOfWeek,
  onAddSlot,
  onEditSlot,
  onOpenEditDialog,
  onOpenBlockTimeDialog,
  onApplyTemplate,
  onClearAll
}: WeeklyOverviewProps) {
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
