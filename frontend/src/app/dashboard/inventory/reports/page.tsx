"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useInventory } from "@/hooks/use-inventory";
import { DailyUsageReport, ItemUsageReport, StockAdjustment, InventoryItem, inventoryApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Extended type for UI display
interface ItemUsageDisplay {
  itemId: string;
  itemName: string;
  itemSku?: string;
  unit: string;
  totalUsed: number;
  averageDaily: number;
  daysWithUsage: number;
  dailyData: Array<{ date: string; used: number }>;
}

interface DailyUsageDisplay {
  date: string;
  totalUsed: number;
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart3, TrendingDown, TrendingUp, Calendar, Download, 
  Package, Loader2, ArrowDownUp, History, RefreshCw, CheckCircle, Search
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useSetPageHeader } from "@/components/providers/page-header-provider";

export default function InventoryReportsPage() {
  const { getToken } = useAuth();
  const { loading, isAdmin, currentOrganization, fetchReportData, allItems } = useInventory();
  const t = useTranslations("inventoryPage");
  const tCommon = useTranslations("common");

  // Set page header
  useSetPageHeader(t("tabs.reports"), t("reports.description"));

  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [dailyUsage, setDailyUsage] = useState<DailyUsageDisplay[]>([]);
  const [itemUsage, setItemUsage] = useState<ItemUsageDisplay[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [sortField, setSortField] = useState<"totalUsed" | "avgDaily">("totalUsed");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Item selection state for usage tab
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  
  // History state
  const [recentHistory, setRecentHistory] = useState<(StockAdjustment & { itemName?: string })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start: Date;
    switch (dateRange) {
      case "7d": start = startOfDay(subDays(new Date(), 7)); break;
      case "30d": start = startOfDay(subDays(new Date(), 30)); break;
      case "90d": start = startOfDay(subDays(new Date(), 90)); break;
      default: start = startOfDay(subDays(new Date(), 30));
    }
    return { start, end };
  };

  useEffect(() => {
    if (currentOrganization) {
      loadReports();
    }
  }, [dateRange, currentOrganization]);

  // Fetch recent history when items are loaded
  useEffect(() => {
    if (currentOrganization && allItems.length > 0) {
      fetchRecentHistory();
    }
  }, [currentOrganization, allItems]);

  const loadReports = async () => {
    setReportLoading(true);
    try {
      const { start, end } = getDateRange();
      const data = await fetchReportData({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
      if (data && data.items) {
        // Transform item usage data
        const transformedItems: ItemUsageDisplay[] = data.items.map(item => {
          const daysWithUsage = item.dailyData.filter(d => d.used > 0).length;
          const averageDaily = daysWithUsage > 0 ? item.totalUsed / daysWithUsage : 0;
          return {
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            totalUsed: item.totalUsed,
            averageDaily,
            daysWithUsage,
            dailyData: item.dailyData.map(d => ({ date: d.date, used: d.used })),
          };
        });
        setItemUsage(transformedItems);

        // Aggregate daily usage across all items
        const dailyMap = new Map<string, number>();
        data.items.forEach(item => {
          item.dailyData.forEach(day => {
            const current = dailyMap.get(day.date) || 0;
            dailyMap.set(day.date, current + day.used);
          });
        });
        
        const transformedDaily: DailyUsageDisplay[] = Array.from(dailyMap.entries())
          .map(([date, totalUsed]) => ({ date, totalUsed }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setDailyUsage(transformedDaily);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const fetchRecentHistory = async () => {
    if (!currentOrganization || allItems.length === 0) return;
    
    setHistoryLoading(true);
    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
        setOrganizationContext(currentOrganization.id);
        
        // Fetch history for the first 10 active items
        const activeItems = allItems.filter(i => i.isActive).slice(0, 10);
        const historyPromises = activeItems.map(item => 
          inventoryApi.getStockHistory(item.id, 5)
            .then(res => res.data.map(h => ({ ...h, itemName: item.name })))
            .catch(() => [])
        );
        
        const allHistory = await Promise.all(historyPromises);
        const combined = allHistory
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20);
        
        setRecentHistory(combined);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sortedItemUsage = [...itemUsage].sort((a, b) => {
    const aVal = sortField === "totalUsed" ? a.totalUsed : a.averageDaily;
    const bVal = sortField === "totalUsed" ? b.totalUsed : b.averageDaily;
    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (field: "totalUsed" | "avgDaily") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter items for selection list
  const filteredItems = allItems.filter(item => 
    item.isActive && 
    (item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
     (item.sku && item.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())))
  );

  // Get daily usage data for selected item
  const getSelectedItemDailyData = () => {
    if (!selectedItem) return [];
    const itemData = itemUsage.find(i => i.itemId === selectedItem.id);
    return itemData?.dailyData || [];
  };

  const selectedItemDailyData = getSelectedItemDailyData();

  const totalUsed = itemUsage.reduce((sum, i) => sum + i.totalUsed, 0);
  const maxUsageItem = itemUsage.length > 0 
    ? itemUsage.reduce((max, i) => i.totalUsed > max.totalUsed ? i : max, itemUsage[0])
    : null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "purchase": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "manual": return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case "appointment": return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case "correction": return <RefreshCw className="h-4 w-4 text-gray-500" />;
      default: return <ArrowDownUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const exportCSV = () => {
    const headers = ["Item", "SKU", "Unit", "Total Used", "Average Daily", "Days Used"];
    const rows = sortedItemUsage.map(item => [
      item.itemName,
      item.itemSku || "",
      item.unit,
      item.totalUsed.toString(),
      item.averageDaily.toFixed(2),
      item.daysWithUsage.toString(),
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("reports.usageTab")}
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            {t("reports.itemsTab")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="h-4 w-4" />
            {t("reports.activityTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("reports.selectItem")}
                </CardTitle>
                <CardDescription>{t("reports.selectItemDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedItem?.id === item.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.imageBase64 ? (
                          <img src={item.imageBase64} alt={item.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.sku || item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold", item.isLowStock && "text-orange-600")}>
                          {item.currentStock} {item.unit}
                        </p>
                        {item.isLowStock && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                            {t("lowStock")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("noItems")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: Usage Graph */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {selectedItem ? selectedItem.name : t("reports.dailyUsage")}
                    </CardTitle>
                    <CardDescription>
                      {selectedItem ? t("reports.itemDailyUsageDesc") : t("reports.dailyUsageDesc")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant={dateRange === "7d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("7d")}
                  >
                    {t("reports.last7Days")}
                  </Button>
                  <Button
                    variant={dateRange === "30d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("30d")}
                  >
                    {t("reports.last30Days")}
                  </Button>
                  <Button
                    variant={dateRange === "90d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("90d")}
                  >
                    {t("reports.last90Days")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : !selectedItem ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("reports.selectItemToView")}</p>
                  </div>
                ) : selectedItemDailyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("reports.noData")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary stats for selected item */}
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {selectedItemDailyData.reduce((sum, d) => sum + d.used, 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("reports.stats.totalUsed")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {(selectedItemDailyData.reduce((sum, d) => sum + d.used, 0) / selectedItemDailyData.length).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("reports.table.avgDaily")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {selectedItemDailyData.filter(d => d.used > 0).length}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("reports.table.daysUsed")}</p>
                      </div>
                    </div>

                    {/* Line chart */}
                    <div className="space-y-1">
                      <div className="relative h-48">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {/* Grid lines */}
                          {[0, 25, 50, 75, 100].map((y) => (
                            <line
                              key={y}
                              x1="0"
                              y1={y}
                              x2="100"
                              y2={y}
                              stroke="currentColor"
                              strokeOpacity="0.1"
                              strokeWidth="0.5"
                            />
                          ))}
                          {/* Line path */}
                          {(() => {
                            const data = selectedItemDailyData.slice(-30);
                            const maxVal = Math.max(...data.map(d => d.used), 1);
                            const points = data.map((day, i) => {
                              const x = (i / (data.length - 1 || 1)) * 100;
                              const y = 100 - (day.used / maxVal) * 100;
                              return `${x},${y}`;
                            }).join(' ');
                            const areaPoints = `0,100 ${points} 100,100`;
                            return (
                              <>
                                {/* Area fill */}
                                <polygon
                                  points={areaPoints}
                                  fill="hsl(var(--primary))"
                                  fillOpacity="0.1"
                                />
                                {/* Line */}
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                />
                                {/* Data points */}
                                {data.map((day, i) => {
                                  const x = (i / (data.length - 1 || 1)) * 100;
                                  const y = 100 - (day.used / maxVal) * 100;
                                  return (
                                    <g key={day.date} className="group">
                                      <circle
                                        cx={x}
                                        cy={y}
                                        r="1.5"
                                        fill="hsl(var(--primary))"
                                        className="cursor-pointer"
                                      />
                                    </g>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </svg>
                        {/* Hover tooltips layer */}
                        <div className="absolute inset-0 flex">
                          {selectedItemDailyData.slice(-30).map((day, i, arr) => {
                            const maxVal = Math.max(...arr.map(d => d.used), 1);
                            return (
                              <div
                                key={day.date}
                                className="flex-1 relative group"
                              >
                                <div 
                                  className="absolute left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
                                  style={{ 
                                    bottom: `${(day.used / maxVal) * 100}%`,
                                    marginBottom: '8px'
                                  }}
                                >
                                  <p className="font-medium">{format(new Date(day.date), "MMM d")}</p>
                                  <p>{day.used.toFixed(1)} {selectedItem?.unit}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pt-2">
                        <span>{format(new Date(selectedItemDailyData[Math.max(0, selectedItemDailyData.length - 30)].date), "MMM d")}</span>
                        <span>{format(new Date(selectedItemDailyData[selectedItemDailyData.length - 1].date), "MMM d")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={exportCSV} disabled={itemUsage.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {t("reports.export")}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("reports.itemUsage")}</CardTitle>
              <CardDescription>{t("reports.itemUsageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : itemUsage.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t("reports.noItemData")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.sku")}</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer select-none"
                        onClick={() => toggleSort("totalUsed")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {t("reports.table.totalUsed")}
                          <ArrowDownUp className={`h-3 w-3 ${sortField === "totalUsed" ? "text-foreground" : "text-muted-foreground"}`} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer select-none"
                        onClick={() => toggleSort("avgDaily")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {t("reports.table.avgDaily")}
                          <ArrowDownUp className={`h-3 w-3 ${sortField === "avgDaily" ? "text-foreground" : "text-muted-foreground"}`} />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t("reports.table.daysUsed")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItemUsage.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.itemSku || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.totalUsed.toFixed(1)} <span className="text-muted-foreground">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.averageDaily.toFixed(2)} <span className="text-muted-foreground">{item.unit}/day</span>
                        </TableCell>
                        <TableCell className="text-right">{item.daysWithUsage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                {t("reports.recentActivity")}
              </CardTitle>
              <CardDescription>{t("reports.recentActivityDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : recentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t("reports.noRecentActivity")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentHistory.map((adj) => (
                    <div 
                      key={adj.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getTypeIcon(adj.type)}
                        <div>
                          <p className="font-medium text-sm">{adj.itemName || "Unknown Item"}</p>
                          <p className="text-xs text-muted-foreground">
                            {adj.reason || adj.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-semibold",
                          adj.quantity >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {adj.quantity > 0 ? "+" : ""}{adj.quantity}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(adj.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
