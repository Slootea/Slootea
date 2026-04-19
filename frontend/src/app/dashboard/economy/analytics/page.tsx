"use client";

import { useEffect, useState, useMemo } from "react";
import { useEconomy } from "@/hooks/use-economy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function AnalyticsPage() {
  const {
    analytics,
    loading,
    currentOrganization,
    isAdmin,
    fetchAnalytics,
  } = useEconomy();
  const t = useTranslations("economyPage");

  useSetPageHeader(t("analytics.title"), t("analytics.description"));

  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");

  // Default: last 6 months
  const defaultDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchAnalytics(startDate, endDate, groupBy);
    }
  }, [currentOrganization, isAdmin, startDate, endDate, groupBy, fetchAnalytics]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

  if (!currentOrganization) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("noOrganization")}</p></div>;
  }
  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("adminOnly")}</p></div>;
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("analytics.period")}</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[160px]"
                />
                <span className="self-center text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("analytics.groupBy")}</label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{t("analytics.day")}</SelectItem>
                  <SelectItem value="week">{t("analytics.week")}</SelectItem>
                  <SelectItem value="month">{t("analytics.month")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && !analytics ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !analytics || analytics.summary.transactionCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">{t("analytics.noData")}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.noDataDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("overview.totalIncome")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.summary.totalIncome)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("overview.totalExpenses")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(analytics.summary.totalExpense)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("overview.netProfit")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analytics.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(analytics.summary.netProfit)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends (line chart) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("analytics.trends")}</CardTitle>
              <CardDescription>{t("overview.incomeVsExpenseDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.trends}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        fontSize: 13,
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value, name) => [
                        formatCurrency(Number(value ?? 0)),
                        name === "income"
                          ? t("transactions.income")
                          : name === "expense"
                            ? t("transactions.expense")
                            : t("overview.netProfit"),
                      ]}
                      labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "income"
                          ? t("transactions.income")
                          : value === "expense"
                            ? t("transactions.expense")
                            : t("overview.netProfit")
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdowns */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Income by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("analytics.incomeBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.incomeByCategory.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.incomeByCategory.map((cat) => (
                      <div key={cat.categoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.categoryColor || "#22c55e" }}
                            />
                            <span className="font-medium">{cat.categoryName}</span>
                          </div>
                          <span>
                            {formatCurrency(cat.total)}{" "}
                            <span className="text-muted-foreground text-xs">({cat.percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.categoryColor || "#22c55e",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">{t("analytics.noData")}</p>
                )}
              </CardContent>
            </Card>

            {/* Expense by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("analytics.expenseBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.expenseByCategory.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.expenseByCategory.map((cat) => (
                      <div key={cat.categoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.categoryColor || "#ef4444" }}
                            />
                            <span className="font-medium">{cat.categoryName}</span>
                          </div>
                          <span>
                            {formatCurrency(cat.total)}{" "}
                            <span className="text-muted-foreground text-xs">({cat.percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.categoryColor || "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">{t("analytics.noData")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
