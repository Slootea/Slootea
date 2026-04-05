"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Users, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { COLORS, TOOLTIP_STYLE, AXIS_TICK_STYLE, GRID_STROKE } from "./constants";
import type { MemberStats } from "@/lib/types";

interface MembersTabProps {
  memberStats: MemberStats[];
  translations: {
    title: string;
    description: string;
    name: string;
    totalAppointments: string;
    completed: string;
    completionRate: string;
    noShowRate: string;
    avgPerDay: string;
    noMembers: string;
    comparison: string;
    comparisonDesc: string;
    legendCompleted: string;
    legendCancelled: string;
    legendNoShow: string;
  };
}

export function MembersTab({ memberStats, translations: t }: MembersTabProps) {
  const sortedMembers = [...memberStats].sort((a, b) => b.totalAppointments - a.totalAppointments);
  
  // Team aggregates
  const teamTotal = memberStats.reduce((sum, m) => sum + m.totalAppointments, 0);
  const teamCompleted = memberStats.reduce((sum, m) => sum + m.completedAppointments, 0);
  const avgRate = memberStats.length > 0 
    ? Math.round(memberStats.reduce((sum, m) => sum + m.completionRate, 0) / memberStats.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Ekip</span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{memberStats.length}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Tamamlanan</span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{teamCompleted}<span className="text-sm text-muted-foreground font-normal">/{teamTotal}</span></p>
        </div>
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Ort. Başarı</span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{avgRate}%</p>
        </div>
      </div>

      {/* Member List */}
      <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sortedMembers.map((member, index) => (
              <div
                key={member.memberId}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-sm font-medium text-muted-foreground">
                  {member.memberName.charAt(0)}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.memberName}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.memberEmail}</p>
                </div>
                
                {/* Stats - Desktop */}
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center min-w-[48px]">
                    <p className="font-semibold">{member.totalAppointments}</p>
                    <p className="text-[10px] text-muted-foreground">Toplam</p>
                  </div>
                  <div className="text-center min-w-[48px]">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{member.completedAppointments}</p>
                    <p className="text-[10px] text-muted-foreground">Tamamlanan</p>
                  </div>
                  <div className="text-center min-w-[48px]">
                    <p className="font-semibold text-rose-500">{member.cancelledAppointments}</p>
                    <p className="text-[10px] text-muted-foreground">İptal</p>
                  </div>
                </div>
                
                {/* Completion Rate */}
                <div className="w-20">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${
                      member.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      member.completionRate < 50 ? 'text-rose-500' : 'text-muted-foreground'
                    }`}>{member.completionRate}%</span>
                  </div>
                  <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        member.completionRate >= 80 ? 'bg-emerald-500' :
                        member.completionRate < 50 ? 'bg-rose-400' : 'bg-muted-foreground'
                      }`}
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {memberStats.length === 0 && (
              <div className="text-center text-muted-foreground py-16 text-sm">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                {t.noMembers}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {memberStats.length > 1 && (
        <Card className="border-0 shadow-[0_2px_20px_hsl(var(--foreground)/0.03)] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">{t.comparison}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedMembers.slice(0, 6)} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK_STYLE} />
                  <YAxis 
                    dataKey="memberName" 
                    type="category" 
                    tick={AXIS_TICK_STYLE} 
                    width={80}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="completedAppointments" name={t.legendCompleted} fill={COLORS.teal} radius={[0, 4, 4, 0]} stackId="stack" />
                  <Bar dataKey="cancelledAppointments" name={t.legendCancelled} fill={COLORS.danger} radius={[0, 4, 4, 0]} stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
