"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { appointmentsApi, bookingLinksApi, setAuthToken } from "@/lib/api";
import { DashboardStats, Appointment, BookingLink } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Copy,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken();
      setAuthToken(token);

      try {
        const [statsRes, todayRes, linksRes] = await Promise.all([
          appointmentsApi.getStats(),
          appointmentsApi.getToday(),
          bookingLinksApi.getAll(),
        ]);
        setStats(statsRes.data);
        setTodayAppointments(todayRes.data);
        setBookingLinks(linksRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken]);

  const copyLinkToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Booking link has been copied to clipboard.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Appointments"
          value={stats?.todayAppointments || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Confirmations"
          value={stats?.pendingConfirmations || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={stats?.pendingConfirmations ? "warning" : "default"}
        />
        <StatCard
          title="Fill Rate"
          value={`${stats?.fillRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="No-Show Rate"
          value={`${stats?.noShowRate || 0}%`}
          icon={<TrendingDown className="h-5 w-5" />}
          variant={stats?.noShowRate && stats.noShowRate > 10 ? "danger" : "default"}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No appointments scheduled for today
              </p>
            ) : (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{apt.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.serviceOption?.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {format(new Date(apt.startTime), "h:mm a")}
                      </p>
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>
                ))}
                {todayAppointments.length > 5 && (
                  <Link href="/dashboard/appointments">
                    <Button variant="outline" className="w-full">
                      View All Appointments
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Share Booking Links
              </span>
              <Link href="/dashboard/links">
                <Button variant="outline" size="sm">
                  Manage Links
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingLinks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No booking links created yet
                </p>
                <Link href="/dashboard/links">
                  <Button>Create Booking Link</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookingLinks.slice(0, 4).map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {link.name || `Link: ${link.slug}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {link.type === "all_options"
                          ? "All Services"
                          : link.serviceOption?.title || "Specific Service"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLinkToClipboard(link.slug)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant = "default",
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantClasses = {
    default: "text-gray-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={variantClasses[variant]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${variantClasses[variant]}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_confirmation: {
      label: "Pending",
      variant: "outline",
    },
    confirmed: {
      label: "Confirmed",
      variant: "default",
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive",
    },
    completed: {
      label: "Completed",
      variant: "secondary",
    },
    no_show: {
      label: "No Show",
      variant: "outline",
    },
  };

  const config = statusConfig[status] || statusConfig.pending_confirmation;

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
