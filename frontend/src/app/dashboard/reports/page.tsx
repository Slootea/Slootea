"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { reportsApi, setAuthToken } from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useTranslations } from "next-intl";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { OrganizationOverview } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, AlertCircle } from "lucide-react";

import {
  ReportsSkeleton,
  OverviewTab,
  TrendsTab,
  MembersTab,
  ServicesTab,
} from "@/components/reports";

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { isAdmin, currentOrganization } = useOrganizationContext();
  const t = useTranslations("reports");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrganizationOverview | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  useEffect(() => {
    if (!isAdmin || !currentOrganization) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);

        const response = await reportsApi.getOverview({
          startDate: format(dateRange.start, "yyyy-MM-dd"),
          endDate: format(dateRange.end, "yyyy-MM-dd"),
        });
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch reports data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken, isAdmin, currentOrganization, dateRange]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const end = new Date();
    let start: Date;

    switch (period) {
      case "7d":
        start = subDays(end, 7);
        break;
      case "30d":
        start = subDays(end, 30);
        break;
      case "90d":
        start = subDays(end, 90);
        break;
      case "thisMonth":
        start = startOfMonth(end);
        break;
      case "lastMonth":
        const lastMonth = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        setDateRange({ start, end: endOfMonth(lastMonth) });
        return;
      default:
        start = subDays(end, 30);
    }

    setDateRange({ start, end });
  };

  if (!isAdmin || !currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("accessDenied")}</h3>
          <p className="text-muted-foreground">{t("adminOnly")}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ReportsSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("noData")}</h3>
          <p className="text-muted-foreground">{t("noDataDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Tabs — Editorial Authority */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("subtitle", { organization: currentOrganization.name })}
            </p>
          </div>
          <div className="flex items-center">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px] border-0 bg-muted/40 shadow-none rounded-xl h-10 text-sm font-medium">
                <SelectValue placeholder={t("selectPeriod")} />
              </SelectTrigger>
              <SelectContent className="border-0 rounded-xl shadow-[0_16px_64px_hsl(var(--foreground)/0.08)] bg-background/95 backdrop-blur-xl">
                <SelectItem value="7d">{t("periods.7d")}</SelectItem>
                <SelectItem value="30d">{t("periods.30d")}</SelectItem>
                <SelectItem value="90d">{t("periods.90d")}</SelectItem>
                <SelectItem value="thisMonth">{t("periods.thisMonth")}</SelectItem>
                <SelectItem value="lastMonth">{t("periods.lastMonth")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs at top */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/30 border-0 rounded-xl p-1 h-auto w-fit">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:shadow-sm text-sm px-5 py-2.5">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="trends" className="rounded-lg data-[state=active]:shadow-sm text-sm px-5 py-2.5">{t("tabs.trends")}</TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg data-[state=active]:shadow-sm text-sm px-5 py-2.5">{t("tabs.members")}</TabsTrigger>
            <TabsTrigger value="services" className="rounded-lg data-[state=active]:shadow-sm text-sm px-5 py-2.5">{t("tabs.services")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <OverviewTab
              totalAppointments={data.totalAppointments}
              completionRate={data.completionRate}
              noShowRate={data.noShowRate}
              totalClients={data.totalClients}
              newClientsThisMonth={data.newClientsThisMonth}
              completedAppointments={data.completedAppointments}
              cancelledAppointments={data.cancelledAppointments}
              noShowAppointments={data.noShowAppointments}
              monthlyAnalytics={data.monthlyAnalytics}
              appointmentsByDayOfWeek={data.appointmentsByDayOfWeek}
              appointmentsByHour={data.appointmentsByHour}
              busiestDay={data.busiestDay}
              busiestHour={data.busiestHour}
              translations={{
                totalAppointments: t("metrics.totalAppointments"),
                completionRate: t("metrics.completionRate"),
                noShowRate: t("metrics.noShowRate"),
                totalClients: t("metrics.totalClients"),
                thisMonth: t("metrics.thisMonth"),
                completed: t("metrics.completed"),
                cancelled: t("metrics.cancelled"),
                noShows: t("metrics.noShows"),
                monthlyTrend: t("charts.monthlyTrend"),
                monthlyTrendDesc: t("charts.monthlyTrendDesc"),
                byDayOfWeek: t("charts.byDayOfWeek"),
                busiestDay: t("charts.busiestDay"),
                byHour: t("charts.byHour"),
                busiestHour: t("charts.busiestHour"),
                legendTotal: t("legend.total"),
                legendCompleted: t("legend.completed"),
              }}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6 mt-0">
            <TrendsTab
              dailyTrend={data.dailyTrend}
              monthlyAnalytics={data.monthlyAnalytics}
              translations={{
                dailyTrend: t("charts.dailyTrend"),
                dailyTrendDesc: t("charts.dailyTrendDesc"),
                newClientsTrend: t("charts.newClientsTrend"),
                newClientsTrendDesc: t("charts.newClientsTrendDesc"),
                legendTotal: t("legend.total"),
                legendCompleted: t("legend.completed"),
                legendCancelled: t("legend.cancelled"),
                legendNoShow: t("legend.noShow"),
                legendNewClients: t("legend.newClients"),
              }}
            />
          </TabsContent>

          <TabsContent value="members" className="space-y-6 mt-0">
            <MembersTab
              memberStats={data.memberStats}
              translations={{
                title: t("members.title"),
                description: t("members.description"),
                name: t("members.name"),
                totalAppointments: t("members.totalAppointments"),
                completed: t("members.completed"),
                completionRate: t("members.completionRate"),
                noShowRate: t("members.noShowRate"),
                avgPerDay: t("members.avgPerDay"),
                noMembers: t("members.noMembers"),
                comparison: t("members.comparison"),
                comparisonDesc: t("members.comparisonDesc"),
                legendCompleted: t("legend.completed"),
                legendCancelled: t("legend.cancelled"),
                legendNoShow: t("legend.noShow"),
              }}
            />
          </TabsContent>

          <TabsContent value="services" className="space-y-6 mt-0">
            <ServicesTab
              topServices={data.topServices}
              translations={{
                title: t("services.title"),
                description: t("services.description"),
                topServices: t("services.topServices"),
                completed: t("services.completed"),
                total: t("services.total"),
                noServices: t("services.noServices"),
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
