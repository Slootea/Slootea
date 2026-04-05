"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  UserX,
  Users,
} from "lucide-react";
import {
  COLORS,
  TOOLTIP_STYLE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
} from "./constants";
import type { MonthlyAnalytics } from "@/lib/types";

interface OverviewTabProps {
  totalAppointments: number;
  completionRate: number;
  noShowRate: number;
  totalClients: number;
  newClientsThisMonth: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  monthlyAnalytics: MonthlyAnalytics[];
  appointmentsByDayOfWeek: Array<{ day: string; count: number }>;
  appointmentsByHour: Array<{ hour: number; count: number }>;
  busiestDay: string;
  busiestHour: number;
  translations: {
    totalAppointments: string;
    completionRate: string;
    noShowRate: string;
    totalClients: string;
    thisMonth: string;
    completed: string;
    cancelled: string;
    noShows: string;
    monthlyTrend: string;
    monthlyTrendDesc: string;
    byDayOfWeek: string;
    busiestDay: string;
    byHour: string;
    busiestHour: string;
    legendTotal: string;
    legendCompleted: string;
  };
}

export function OverviewTab({
  totalAppointments,
  completionRate,
  noShowRate,
  totalClients,
  newClientsThisMonth,
  completedAppointments,
  cancelledAppointments,
  noShowAppointments,
  monthlyAnalytics,
  appointmentsByDayOfWeek,
  appointmentsByHour,
  busiestDay,
  busiestHour,
  translations: t,
}: OverviewTabProps) {
  // Calculate progress percentages for visual bars
  const completedPercent = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  const cancelledPercent = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;
  const noShowPercent = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics - Compact horizontal layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{totalAppointments}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.totalAppointments}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{completionRate}%</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.completionRate}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <UserX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{noShowRate}%</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.noShowRate}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{totalClients}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t.totalClients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Breakdown Bar */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Randevu Dağılımı</p>
            <p className="text-xs text-muted-foreground">+{newClientsThisMonth} {t.thisMonth.toLowerCase()}</p>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
            <div 
              className="bg-emerald-500 transition-all" 
              style={{ width: `${completedPercent}%` }}
              title={`${t.completed}: ${completedAppointments}`}
            />
            <div 
              className="bg-rose-500 transition-all" 
              style={{ width: `${cancelledPercent}%` }}
              title={`${t.cancelled}: ${cancelledAppointments}`}
            />
            <div 
              className="bg-amber-500 transition-all" 
              style={{ width: `${noShowPercent}%` }}
              title={`${t.noShows}: ${noShowAppointments}`}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">{t.completed}</span>
              <span className="font-medium">{completedAppointments}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">{t.cancelled}</span>
              <span className="font-medium">{cancelledAppointments}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{t.noShows}</span>
              <span className="font-medium">{noShowAppointments}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart - Monthly Trend */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.monthlyTrend}</CardTitle>
          <CardDescription className="text-xs">{t.monthlyTrendDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyAnalytics}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="totalAppointments" name={t.legendTotal} stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="completedAppointments" name={t.legendCompleted} stroke={COLORS.teal} strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t.byDayOfWeek}</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{busiestDay}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsByDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="day" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={25} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t.byHour}</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">{busiestHour}:00</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appointmentsByHour.filter((h) => h.count > 0)}>
                  <defs>
                    <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="hour" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}:00`} />
                  <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={25} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `${v}:00`} />
                  <Area type="monotone" dataKey="count" stroke={COLORS.cyan} strokeWidth={2} fillOpacity={1} fill="url(#colorHour)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
