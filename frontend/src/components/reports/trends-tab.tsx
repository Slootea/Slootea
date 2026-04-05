"use client";

import { format } from "date-fns";
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
import { TrendingUp, Users } from "lucide-react";
import {
  COLORS,
  TOOLTIP_STYLE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
} from "./constants";
import type { TrendData, MonthlyAnalytics } from "@/lib/types";

interface TrendsTabProps {
  dailyTrend: TrendData[];
  monthlyAnalytics: MonthlyAnalytics[];
  translations: {
    dailyTrend: string;
    dailyTrendDesc: string;
    newClientsTrend: string;
    newClientsTrendDesc: string;
    legendTotal: string;
    legendCompleted: string;
    legendCancelled: string;
    legendNoShow: string;
    legendNewClients: string;
  };
}

export function TrendsTab({
  dailyTrend,
  monthlyAnalytics,
  translations: t,
}: TrendsTabProps) {
  // Calculate trend summary
  const totalNewClients = monthlyAnalytics.reduce((sum, m) => sum + (m.newClients || 0), 0);
  const avgDailyAppointments = dailyTrend.length > 0 
    ? Math.round(dailyTrend.reduce((sum, d) => sum + d.appointments, 0) / dailyTrend.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{avgDailyAppointments}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Günlük Ort.</p>
          </div>
        </div>
        <div className="rounded-xl bg-muted/30 p-4 flex items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2">
            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xl font-bold">{totalNewClients}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Yeni Müşteri</p>
          </div>
        </div>
      </div>

      {/* Daily Trend - Area Chart */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.dailyTrend}</CardTitle>
          <CardDescription className="text-xs">{t.dailyTrendDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="trendTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={AXIS_TICK_STYLE} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => format(new Date(value), "d MMM")}
                />
                <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={30} />
                <Tooltip 
                  contentStyle={TOOLTIP_STYLE} 
                  labelFormatter={(value) => format(new Date(value), "d MMMM yyyy")}
                />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="appointments" name={t.legendTotal} stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#trendTotal)" />
                <Area type="monotone" dataKey="completed" name={t.legendCompleted} stroke={COLORS.teal} strokeWidth={1.5} fillOpacity={1} fill="url(#trendCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* New Clients Trend */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.newClientsTrend}</CardTitle>
          <CardDescription className="text-xs">{t.newClientsTrendDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="newClients" name={t.legendNewClients} fill={COLORS.purple} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
