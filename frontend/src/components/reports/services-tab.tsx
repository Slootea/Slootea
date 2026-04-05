"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { COLORS, TOOLTIP_STYLE, AXIS_TICK_STYLE, GRID_STROKE } from "./constants";
import type { ServiceStat } from "@/lib/types";

const SERVICE_COLORS = [
  COLORS.primary,
  COLORS.teal,
  COLORS.purple,
  COLORS.cyan,
  COLORS.orange,
];

interface ServicesTabProps {
  topServices: ServiceStat[];
  translations: {
    title: string;
    description: string;
    topServices: string;
    completed: string;
    total: string;
    noServices: string;
  };
}

export function ServicesTab({ topServices, translations: t }: ServicesTabProps) {
  const totalAppointments = topServices.reduce((sum, s) => sum + s.totalAppointments, 0);
  const topService = topServices[0];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{topServices.length}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Aktif Hizmet</p>
          </div>
        </div>
        {topService && (
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">En Popüler</p>
            <p className="font-semibold text-sm truncate">{topService.serviceName}</p>
            <p className="text-xs text-muted-foreground">{topService.percentage}% • {topService.totalAppointments} randevu</p>
          </div>
        )}
      </div>

      {/* Horizontal Bar Chart */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.title}</CardTitle>
          <CardDescription className="text-xs">{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServices.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_STYLE} />
                <YAxis 
                  dataKey="serviceName" 
                  type="category" 
                  tick={AXIS_TICK_STYLE} 
                  width={120}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="totalAppointments" name={t.total} fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Service List */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.topServices}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topServices.slice(0, 5).map((service, index) => (
            <div
              key={service.serviceId}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/40 text-foreground font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{service.serviceName}</p>
                  <div className="flex items-center gap-1.5 ml-2">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="font-bold text-sm">{service.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${service.percentage}%`,
                      backgroundColor: SERVICE_COLORS[index % 5],
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {service.completedAppointments} {t.completed} / {service.totalAppointments} {t.total}
                </p>
              </div>
            </div>
          ))}
          {topServices.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {t.noServices}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
