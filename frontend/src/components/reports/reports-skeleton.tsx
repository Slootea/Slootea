"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ReportsSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-[180px] rounded-xl" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted/20 p-6 space-y-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted/15 p-4">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-background shadow-[0_4px_32px_hsl(var(--foreground)/0.04)] p-6 space-y-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
