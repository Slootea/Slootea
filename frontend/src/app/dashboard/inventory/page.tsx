"use client";

import { useInventory } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Package, AlertTriangle, Loader2,
  ShoppingCart, Archive, CheckCircle2, XCircle
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSetPageHeader } from "@/components/providers/page-header-provider";

export default function InventoryOverviewPage() {
  const { 
    allItems, 
    loading, 
    lowStockSummary, 
    stats, 
    isAdmin, 
    currentOrganization 
  } = useInventory();
  const t = useTranslations("inventoryPage");

  // Set page header
  useSetPageHeader(t("title"), t("description"));

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.totalItems")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeItems} {t("stats.active")}
            </p>
          </CardContent>
        </Card>
        
        <Card className={stats.lowStockItems > 0 ? "border-orange-200 dark:border-orange-900" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.lowStock")}</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.lowStockItems > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStockItems > 0 ? "text-orange-600" : ""}`}>
              {stats.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.outOfStockItems} {t("stats.outOfStock")}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.categories")}</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.consumables}</span>
              <span className="text-sm text-muted-foreground">/ {stats.retail}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("categories.consumable")} / {t("categories.retail")}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.inventoryHealth")}</CardTitle>
            {stats.healthPercentage >= 70 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : stats.healthPercentage >= 40 ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.healthPercentage}%</div>
            <Progress value={stats.healthPercentage} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("charts.stockLevels")}</CardTitle>
            <CardDescription>{t("charts.stockLevelsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allItems
                .filter(i => i.isActive)
                .sort((a, b) => (a.currentStock / Math.max(a.minStockAlert, 1)) - (b.currentStock / Math.max(b.minStockAlert, 1)))
                .slice(0, 8)
                .map(item => {
                  const percentage = item.minStockAlert > 0 
                    ? Math.min((item.currentStock / item.minStockAlert) * 100, 200) 
                    : 100;
                  const isLow = item.isLowStock;
                  const isEmpty = item.currentStock === 0;
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium truncate max-w-[200px] ${isEmpty ? "text-red-600" : isLow ? "text-orange-600" : ""}`}>
                          {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {item.currentStock} / {item.minStockAlert} {item.unit}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            isEmpty ? "bg-red-500" : 
                            isLow ? "bg-orange-500" : 
                            percentage > 150 ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {allItems.filter(i => i.isActive).length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t("noItems")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("charts.lowStockAlerts")}</CardTitle>
            <CardDescription>{t("charts.lowStockAlertsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockSummary && lowStockSummary.items.length > 0 ? (
              <div className="space-y-3">
                {lowStockSummary.items.slice(0, 6).map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900"
                  >
                    <div className="flex items-center gap-3">
                      {item.imageBase64 ? (
                        <img src={item.imageBase64} alt={item.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Package className="h-5 w-5 text-orange-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku || "-"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{item.currentStock} {item.unit}</p>
                      <p className="text-xs text-muted-foreground">{t("minAlert")}: {item.minStockAlert}</p>
                    </div>
                  </div>
                ))}
                {lowStockSummary.items.length > 6 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/inventory/items?lowStock=true">
                      {t("viewAll")} ({lowStockSummary.items.length - 6} {t("more")})
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium text-green-600">{t("allStocksHealthy")}</p>
                <p className="text-sm text-muted-foreground">{t("allStocksHealthyDesc")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("charts.categoryBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">{t("categories.consumable")}</span>
              </div>
              <p className="text-3xl font-bold">{stats.consumables}</p>
              <p className="text-sm text-muted-foreground">{t("stats.itemsCount")}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Archive className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-medium">{t("categories.retail")}</span>
              </div>
              <p className="text-3xl font-bold">{stats.retail}</p>
              <p className="text-sm text-muted-foreground">{t("stats.itemsCount")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
