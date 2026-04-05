"use client";

import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Users,
} from "lucide-react";

interface SecondaryMetricsProps {
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  averageAppointmentsPerDay: number;
  activeMembers: number;
  totalMembers: number;
  translations: {
    completed: string;
    cancelled: string;
    noShows: string;
    avgPerDay: string;
    activeMembers: string;
  };
}

export function SecondaryMetrics({
  completedAppointments,
  cancelledAppointments,
  noShowAppointments,
  averageAppointmentsPerDay,
  activeMembers,
  totalMembers,
  translations: t,
}: SecondaryMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/60 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {t.completed}
            </p>
            <p className="text-xl font-bold tracking-tight">
              {completedAppointments}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/60 shadow-sm">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {t.cancelled}
            </p>
            <p className="text-xl font-bold tracking-tight">
              {cancelledAppointments}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/60 shadow-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {t.noShows}
            </p>
            <p className="text-xl font-bold tracking-tight">
              {noShowAppointments}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/60 shadow-sm">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {t.avgPerDay}
            </p>
            <p className="text-xl font-bold tracking-tight">
              {averageAppointmentsPerDay}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-zinc-900/60 shadow-sm">
            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {t.activeMembers}
            </p>
            <p className="text-xl font-bold tracking-tight">
              {activeMembers}/{totalMembers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
