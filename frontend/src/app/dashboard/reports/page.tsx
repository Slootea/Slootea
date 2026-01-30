"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { reportsApi, setAuthToken } from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useTranslations } from "next-intl";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  OrganizationOverview,
  MemberStats,
  MonthlyAnalytics,
  ServiceStat,
  TrendData,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserX,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Color palette for charts
const COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#94a3b8",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  orange: "#f97316",
};

const STATUS_COLORS: Record<string, string> = {
  completed: COLORS.success,
  cancelled: COLORS.danger,
  no_show: COLORS.warning,
  pending: COLORS.muted,
  confirmed: COLORS.blue,
};

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { isAdmin, currentOrganization } = useOrganizationContext();
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");

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
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">
            {t("subtitle", { organization: currentOrganization.name })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("selectPeriod")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("periods.7d")}</SelectItem>
              <SelectItem value="30d">{t("periods.30d")}</SelectItem>
              <SelectItem value="90d">{t("periods.90d")}</SelectItem>
              <SelectItem value="thisMonth">{t("periods.thisMonth")}</SelectItem>
              <SelectItem value="lastMonth">{t("periods.lastMonth")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={t("metrics.totalAppointments")}
          value={data.totalAppointments}
          icon={<Calendar className="h-4 w-4" />}
          trend={null}
        />
        <MetricCard
          title={t("metrics.completionRate")}
          value={`${data.completionRate}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend={data.completionRate >= 80 ? "up" : data.completionRate < 50 ? "down" : null}
          trendColor={data.completionRate >= 80 ? "green" : data.completionRate < 50 ? "red" : undefined}
        />
        <MetricCard
          title={t("metrics.noShowRate")}
          value={`${data.noShowRate}%`}
          icon={<UserX className="h-4 w-4" />}
          trend={data.noShowRate > 10 ? "down" : data.noShowRate <= 5 ? "up" : null}
          trendColor={data.noShowRate > 10 ? "red" : data.noShowRate <= 5 ? "green" : undefined}
        />
        <MetricCard
          title={t("metrics.totalClients")}
          value={data.totalClients}
          icon={<Users className="h-4 w-4" />}
          subtitle={`+${data.newClientsThisMonth} ${t("metrics.thisMonth")}`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("metrics.completed")}</p>
                <p className="text-lg font-bold">{data.completedAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("metrics.cancelled")}</p>
                <p className="text-lg font-bold">{data.cancelledAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("metrics.noShows")}</p>
                <p className="text-lg font-bold">{data.noShowAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("metrics.avgPerDay")}</p>
                <p className="text-lg font-bold">{data.averageAppointmentsPerDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("metrics.activeMembers")}</p>
                <p className="text-lg font-bold">{data.activeMembers}/{data.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="trends">{t("tabs.trends")}</TabsTrigger>
          <TabsTrigger value="members">{t("tabs.members")}</TabsTrigger>
          <TabsTrigger value="services">{t("tabs.services")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Monthly Appointments Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("charts.monthlyTrend")}</CardTitle>
                <CardDescription>{t("charts.monthlyTrendDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlyAnalytics}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="totalAppointments"
                        name={t("legend.total")}
                        stroke={COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                      />
                      <Area
                        type="monotone"
                        dataKey="completedAppointments"
                        name={t("legend.completed")}
                        stroke={COLORS.success}
                        fillOpacity={1}
                        fill="url(#colorCompleted)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("charts.statusDistribution")}</CardTitle>
                <CardDescription>{t("charts.statusDistributionDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={data.appointmentsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ payload }) => `${payload?.status} (${payload?.percentage}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        {data.appointmentsByStatus.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.status] || COLORS.muted} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Appointments by Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("charts.byDayOfWeek")}</CardTitle>
                <CardDescription>
                  {t("charts.busiestDay")}: <span className="font-semibold text-primary">{data.busiestDay}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.appointmentsByDayOfWeek}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Appointments by Hour */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("charts.byHour")}</CardTitle>
                <CardDescription>
                  {t("charts.busiestHour")}: <span className="font-semibold text-primary">{data.busiestHour}:00</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.appointmentsByHour.filter(h => h.count > 0)}>
                      <defs>
                        <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}:00`}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        labelFormatter={(value) => `${value}:00`}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={COLORS.cyan}
                        fillOpacity={1}
                        fill="url(#colorHour)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("charts.dailyTrend")}</CardTitle>
              <CardDescription>{t("charts.dailyTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      labelFormatter={(value) => format(new Date(value), "MMMM d, yyyy")}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="appointments"
                      name={t("legend.total")}
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name={t("legend.completed")}
                      stroke={COLORS.success}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cancelled"
                      name={t("legend.cancelled")}
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="noShow"
                      name={t("legend.noShow")}
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* New Clients Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("charts.newClientsTrend")}</CardTitle>
              <CardDescription>{t("charts.newClientsTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar 
                      dataKey="newClients" 
                      name={t("legend.newClients")}
                      fill={COLORS.purple}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("members.title")}</CardTitle>
              <CardDescription>{t("members.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("members.name")}</TableHead>
                    <TableHead className="text-right">{t("members.totalAppointments")}</TableHead>
                    <TableHead className="text-right">{t("members.completed")}</TableHead>
                    <TableHead className="text-right">{t("members.completionRate")}</TableHead>
                    <TableHead className="text-right">{t("members.noShowRate")}</TableHead>
                    <TableHead className="text-right">{t("members.avgPerDay")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.memberStats.map((member) => (
                    <TableRow key={member.memberId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.memberName}</p>
                          <p className="text-xs text-muted-foreground">{member.memberEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {member.totalAppointments}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.completedAppointments}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={member.completionRate >= 80 ? "default" : member.completionRate < 50 ? "destructive" : "secondary"}
                        >
                          {member.completionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={member.noShowRate > 10 ? "destructive" : member.noShowRate <= 5 ? "default" : "secondary"}
                        >
                          {member.noShowRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.averageAppointmentsPerDay}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.memberStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t("members.noMembers")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Member Performance Comparison Chart */}
          {data.memberStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("members.comparison")}</CardTitle>
                <CardDescription>{t("members.comparisonDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.memberStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="memberName" 
                        type="category" 
                        tick={{ fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="completedAppointments" 
                        name={t("legend.completed")}
                        fill={COLORS.success}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar 
                        dataKey="cancelledAppointments" 
                        name={t("legend.cancelled")}
                        fill={COLORS.danger}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar 
                        dataKey="noShowAppointments" 
                        name={t("legend.noShow")}
                        fill={COLORS.warning}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("services.title")}</CardTitle>
                <CardDescription>{t("services.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={data.topServices}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ payload }) => `${(payload?.serviceName || '').substring(0, 15)}${(payload?.serviceName?.length || 0) > 15 ? '...' : ''} (${payload?.percentage}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="totalAppointments"
                        nameKey="serviceName"
                      >
                        {data.topServices.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={[COLORS.primary, COLORS.success, COLORS.purple, COLORS.cyan, COLORS.orange, COLORS.pink][index % 6]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("services.topServices")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topServices.slice(0, 5).map((service, index) => (
                    <div key={service.serviceId} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.completedAppointments} {t("services.completed")} / {service.totalAppointments} {t("services.total")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{service.percentage}%</p>
                      </div>
                    </div>
                  ))}
                  {data.topServices.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {t("services.noServices")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon,
  trend,
  trendColor,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | null;
  trendColor?: "green" | "red";
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          {trend && (
            <span className={`flex items-center text-xs ${trendColor === "green" ? "text-green-600" : "text-red-600"}`}>
              {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle || title}</p>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-4 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
