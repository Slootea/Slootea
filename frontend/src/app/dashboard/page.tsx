"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { appointmentsApi, bookingLinksApi, setAuthToken } from "@/lib/api";
import { DashboardStats, Appointment, BookingLink, AppointmentStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Copy,
  User,
  Phone,
  Mail,
  Timer,
  Sparkles,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, differenceInMinutes, isAfter } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tAppointments = useTranslations("appointments");
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
      title: t("quickShare.linkCopied"),
      description: t("quickShare.linkCopiedDesc"),
    });
  };

  // Find next upcoming appointment (not cancelled/completed and in the future)
  const now = new Date();
  const nextAppointment = todayAppointments.find(
    (apt) =>
      isAfter(parseISO(apt.startTime), now) &&
      apt.status !== AppointmentStatus.CANCELLED &&
      apt.status !== AppointmentStatus.COMPLETED
  );

  // Remaining appointments (excluding the next one)
  const remainingAppointments = todayAppointments.filter(
    (apt) => apt.id !== nextAppointment?.id
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title={t("stats.today")}
          value={stats?.todayAppointments || 0}
          subtitle={t("stats.appointments")}
          icon={<Calendar className="h-5 w-5" />}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title={t("stats.pending")}
          value={stats?.pendingConfirmations || 0}
          subtitle={t("stats.confirmations")}
          icon={<AlertCircle className="h-5 w-5" />}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          title={t("stats.fillRate")}
          value={`${stats?.fillRate || 0}%`}
          subtitle={t("stats.last30Days")}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="from-emerald-500 to-green-500"
        />
        <StatCard
          title={t("stats.noShowRate")}
          value={`${stats?.noShowRate || 0}%`}
          subtitle={t("stats.last30Days")}
          icon={<TrendingDown className="h-5 w-5" />}
          gradient="from-rose-500 to-red-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Client Card */}
          {nextAppointment ? (
            <NextClientCard appointment={nextAppointment} t={t} tAppointments={tAppointments} />
          ) : (
            <NoUpcomingCard hasAppointments={todayAppointments.length > 0} t={t} />
          )}

          {/* Today's Schedule List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    {t("todaysSchedule.title")}
                  </CardTitle>
                  <CardDescription>
                    {todayAppointments.length} {todayAppointments.length !== 1 ? t("todaysSchedule.appointmentsToday") : t("todaysSchedule.appointmentToday")}
                  </CardDescription>
                </div>
                <Link href="/dashboard/appointments">
                  <Button variant="ghost" size="sm" className="gap-1">
                    {tCommon("viewAll")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {remainingAppointments.length === 0 && !nextAppointment ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {t("todaysSchedule.noAppointments")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {remainingAppointments.slice(0, 2).map((apt, index) => (
                    <ScheduleItem key={apt.id} appointment={apt} index={index} tAppointments={tAppointments} />
                  ))}
                  {remainingAppointments.length > 2 && (
                    <div className="pt-2">
                      <Link href="/dashboard/appointments">
                        <Button variant="outline" className="w-full" size="sm">
                          +{remainingAppointments.length - 2} {t("todaysSchedule.moreAppointments")}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Quick Share Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("quickShare.title")}
              </CardTitle>
              <CardDescription>
                {t("quickShare.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingLinks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("quickShare.noLinks")}
                  </p>
                  <Link href="/dashboard/links">
                    <Button size="sm">{t("quickShare.createLink")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookingLinks.slice(0, 4).map((link) => (
                    <div
                      key={link.id}
                      className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {link.name || `Link: ${link.slug}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {link.type === "all_options"
                            ? t("quickShare.allServices")
                            : link.serviceOption?.title || t("quickShare.specificService")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyLinkToClipboard(link.slug)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Link href="/dashboard/links" className="block pt-2">
                    <Button variant="outline" className="w-full" size="sm">
                      {t("quickShare.manageLinks")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Next Client Elegant Card
function NextClientCard({ appointment, t, tAppointments }: { appointment: Appointment; t: any; tAppointments: any }) {
  const startTime = parseISO(appointment.startTime);
  const endTime = parseISO(appointment.endTime);
  const minutesUntil = differenceInMinutes(startTime, new Date());
  const isImminent = minutesUntil <= 30 && minutesUntil > 0;
  const isNow = minutesUntil <= 0 && minutesUntil > -(appointment.serviceOption?.duration || 60);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Gradient Header */}
      <div
        className={`relative px-6 py-8 ${
          isNow
            ? "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"
            : isImminent
            ? "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
            : "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500"
        }`}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">
                {isNow ? t("nextClient.happeningNow") : isImminent ? t("nextClient.startingSoon") : t("nextClient.title")}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {appointment.clientName}
              </h2>
            </div>
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                isNow
                  ? "bg-white text-emerald-600"
                  : isImminent
                  ? "bg-white text-amber-600"
                  : "bg-white/20 text-white"
              }`}
            >
              {isNow
                ? t("nextClient.inProgress")
                : formatDistanceToNow(startTime, { addSuffix: true })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-white/90">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="text-sm font-medium">
                {appointment.serviceOption?.duration || 0} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <CardContent className="p-6">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Service Info */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {t("nextClient.service")}
              </p>
              <p className="font-semibold text-lg">
                {appointment.serviceOption?.title || "Appointment"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("nextClient.status")}
              </p>
              <StatusBadge status={appointment.status} tAppointments={tAppointments} />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("nextClient.contactDetails")}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground truncate">
                  {appointment.clientEmail}
                </span>
              </div>
              {appointment.clientPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">
                    {appointment.clientPhone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {appointment.notes && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t("nextClient.notes")}
            </p>
            <p className="text-sm">{appointment.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// No Upcoming Appointments Card
function NoUpcomingCard({ hasAppointments, t }: { hasAppointments: boolean; t: any }) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardContent className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {hasAppointments ? t("noUpcoming.allDone") : t("noUpcoming.noAppointments")}
        </h3>
        <p className="text-muted-foreground mb-4">
          {hasAppointments
            ? t("noUpcoming.allDoneDesc")
            : t("noUpcoming.noAppointmentsDesc")}
        </p>
        <Link href="/dashboard/appointments">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t("noUpcoming.viewSchedule")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// Schedule Item Component
function ScheduleItem({ appointment, index, tAppointments }: { appointment: Appointment; index: number; tAppointments: any }) {
  const startTime = parseISO(appointment.startTime);
  const isPast = new Date() > parseISO(appointment.endTime);
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
        isPast || isCompleted || isCancelled
          ? "bg-muted/30 opacity-60"
          : "bg-muted/50 hover:bg-muted"
      }`}
    >
      {/* Time Column */}
      <div className="flex-shrink-0 w-16 text-center">
        <p className="text-sm font-semibold">{format(startTime, "h:mm")}</p>
        <p className="text-xs text-muted-foreground">{format(startTime, "a")}</p>
      </div>

      {/* Divider */}
      <div className="flex-shrink-0 w-px h-10 bg-border" />

      {/* Client Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{appointment.clientName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {appointment.serviceOption?.title}
        </p>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusBadge status={appointment.status} size="sm" tAppointments={tAppointments} />
      </div>
    </div>
  );
}

// Enhanced Stat Card
function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
      />
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div
            className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Status Badge
function StatusBadge({ status, size = "default", tAppointments }: { status: string; size?: "sm" | "default"; tAppointments: any }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
  > = {
    pending_confirmation: {
      label: tAppointments("status.pending"),
      variant: "outline",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    confirmed: {
      label: tAppointments("status.confirmed"),
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    cancelled: {
      label: tAppointments("status.cancelled"),
      variant: "destructive",
      icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
      label: tAppointments("status.completed"),
      variant: "secondary",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    no_show: {
      label: tAppointments("status.noShow"),
      variant: "outline",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status] || config.pending_confirmation;

  return (
    <Badge
      variant={variant}
      className={size === "sm" ? "text-xs px-2 py-0.5" : ""}
    >
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Next Client Card Skeleton */}
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-indigo-500/20" />
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-12 mb-2" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule List Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-10 w-16" />
                    <div className="w-px h-10 bg-border" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
