"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | null;
  trendColor?: "green" | "red";
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  trendColor,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="p-2.5 rounded-xl bg-background shadow-sm text-muted-foreground">
          {icon}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
              trendColor === "green"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1">
          {title}
        </p>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
