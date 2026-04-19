"use client";

import { useEffect, useMemo } from "react";
import { useEconomy } from "@/hooks/use-economy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { Badge } from "@/components/ui/badge";

export default function EconomyOverviewPage() {
  const {
    transactions,
    loading,
    summary,
    currentOrganization,
    isAdmin,
    fetchTransactions,
    fetchSummary,
  } = useEconomy();
  const t = useTranslations("economyPage");

  useSetPageHeader(t("title"), t("description"));

  // Current month date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchSummary(startDate, endDate);
      fetchTransactions({ limit: 10, sortBy: "date", sortOrder: "DESC" });
    }
  }, [currentOrganization, isAdmin, startDate, endDate, fetchSummary, fetchTransactions]);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("adminOnly")}</p>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

  return (
    <div className="container py-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.totalIncome")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">{t("overview.thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.totalExpenses")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.totalExpense ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">{t("overview.thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.netProfit")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(summary?.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(summary?.netProfit ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">{t("overview.thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.transactions")}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.transactionCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t("overview.thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.incomeVsExpense")}</CardTitle>
            <CardDescription>{t("overview.incomeVsExpenseDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary && (summary.totalIncome > 0 || summary.totalExpense > 0) ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-green-600">{t("overview.totalIncome")}</span>
                      <span>{formatCurrency(summary.totalIncome)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${
                            summary.totalIncome + summary.totalExpense > 0
                              ? (summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-red-600">{t("overview.totalExpenses")}</span>
                      <span>{formatCurrency(summary.totalExpense)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{
                          width: `${
                            summary.totalIncome + summary.totalExpense > 0
                              ? (summary.totalExpense / (summary.totalIncome + summary.totalExpense)) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">{t("overview.noTransactions")}</p>
                  <p className="text-sm text-muted-foreground">{t("overview.noTransactionsDesc")}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/dashboard/economy/income">
                    <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
                    {t("transactions.addIncome")}
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/dashboard/economy/expenses">
                    <ArrowDownRight className="h-4 w-4 mr-1 text-red-500" />
                    {t("transactions.addExpense")}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 8).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-full ${
                          tx.type === "income"
                            ? "bg-green-100 dark:bg-green-950"
                            : "bg-red-100 dark:bg-red-950"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p
                        className={`font-semibold text-sm ${
                          tx.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                      {tx.categoryName && (
                        <Badge variant="secondary" className="text-[10px]">
                          {tx.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">{t("overview.noTransactions")}</p>
                <p className="text-sm text-muted-foreground">{t("overview.noTransactionsDesc")}</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/economy/expenses">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("overview.addFirst")}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
