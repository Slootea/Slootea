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
  dailyData: Array<{ date: string; used: number; added: number; netChange: number }>;
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
  Package, Loader2, ArrowDownUp, History, RefreshCw, CheckCircle, Search,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useSetPageHeader } from "@/components/providers/page-header-provider";

interface StockMovementChartProps {
  data: Array<{ date: string; used: number; added: number; netChange: number }>;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  labels: { added: string; used: string; net: string; stockLevel: string; minAlert: string };
}

function StockMovementChart({ data, unit, currentStock, minStockAlert, labels }: StockMovementChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  // Reconstruct historical end-of-day stock by walking backwards from current stock
  // stock[last] = currentStock (snapshot at end of period). stock[i-1] = stock[i] - netChange[i]
  const stockSeries: number[] = new Array(data.length);
  stockSeries[data.length - 1] = currentStock;
  for (let i = data.length - 1; i > 0; i--) {
    stockSeries[i - 1] = stockSeries[i] - (data[i].netChange || 0);
  }

  // Layout (Material/Google-ish: generous whitespace, light grid)
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Y scale based on stock series, including min alert and zero
  const allValues = [...stockSeries, minStockAlert, 0];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = Math.max(rawMax - rawMin, 1);

  const niceCeil = (v: number) => {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / exp;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return m * exp;
  };

  // Add 10% padding above
  const padTop = niceCeil(range * 0.1);
  const yMax = rawMax + padTop;
  const yMin = Math.min(0, rawMin);

  const xAt = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Y ticks (5 ticks)
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }, (_, i) => yMin + ((yMax - yMin) * i) / (tickCount - 1));

  // Build smooth-ish polyline + area
  const linePoints = data.map((_, i) => `${xAt(i)},${yAt(stockSeries[i])}`).join(' ');
  const areaPoints = `${padL},${yAt(yMin)} ${linePoints} ${xAt(data.length - 1)},${yAt(yMin)}`;

  // X axis labels
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const xLabelIdx: number[] = [];
  for (let i = 0; i < data.length; i += labelStep) xLabelIdx.push(i);
  if (xLabelIdx[xLabelIdx.length - 1] !== data.length - 1) xLabelIdx.push(data.length - 1);

  const fmtNum = (n: number) => {
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  };

  // Min alert visibility
  const showMinAlert = minStockAlert > 0 && minStockAlert >= yMin && minStockAlert <= yMax;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-500" />
          <span>{labels.stockLevel}</span>
        </div>
        {showMinAlert && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 border-t border-dashed border-orange-500"
              style={{ borderTopWidth: 2 }}
            />
            <span>{labels.minAlert}: {fmtNum(minStockAlert)} {unit}</span>
          </div>
        )}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="stockArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal grid + Y labels */}
          {yTicks.map((t, i) => {
            const y = yAt(t);
            return (
              <g key={`yt-${i}`}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 11 }}
                >
                  {fmtNum(t)}
                </text>
              </g>
            );
          })}

          {/* Min alert line */}
          {showMinAlert && (
            <g>
              <line
                x1={padL}
                x2={W - padR}
                y1={yAt(minStockAlert)}
                y2={yAt(minStockAlert)}
                stroke="rgb(249,115,22)"
                strokeOpacity={0.85}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            </g>
          )}

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#stockArea)" />

          {/* Line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="rgb(59,130,246)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover hit areas + crosshair + dots */}
          {data.map((d, i) => {
            const x = xAt(i);
            const y = yAt(stockSeries[i]);
            const bandLeft = i === 0 ? padL : (xAt(i - 1) + x) / 2;
            const bandRight = i === data.length - 1 ? W - padR : (x + xAt(i + 1)) / 2;
            return (
              <g key={d.date}>
                <rect
                  x={bandLeft}
                  y={padT}
                  width={Math.max(1, bandRight - bandLeft)}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
                {hoverIdx === i && (
                  <>
                    <line
                      x1={x}
                      x2={x}
                      y1={padT}
                      y2={padT + plotH}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={1}
                    />
                    <circle cx={x} cy={y} r={5} fill="rgb(59,130,246)" fillOpacity={0.18} />
                    <circle
                      cx={x}
                      cy={y}
                      r={3.5}
                      fill="hsl(var(--background))"
                      stroke="rgb(59,130,246)"
                      strokeWidth={2}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* X labels */}
          {xLabelIdx.map((i) => {
            const x = xAt(i);
            const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle';
            return (
              <text
                key={`xl-${i}`}
                x={x}
                y={H - 12}
                textAnchor={anchor}
                className="fill-muted-foreground"
                style={{ fontSize: 11 }}
              >
                {format(new Date(data[i].date), 'MMM d')}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverIdx !== null && (() => {
          const d = data[hoverIdx];
          const stock = stockSeries[hoverIdx];
          const leftPct = (xAt(hoverIdx) / W) * 100;
          const flip = leftPct > 65;
          const belowAlert = minStockAlert > 0 && stock <= minStockAlert;
          return (
            <div
              className="pointer-events-none absolute px-3 py-2 rounded-md border bg-popover shadow-lg text-xs whitespace-nowrap z-10"
              style={{
                left: `${leftPct}%`,
                top: 4,
                transform: `translate(${flip ? 'calc(-100% - 10px)' : '10px'}, 0)`,
              }}
            >
              <p className="font-medium mb-1.5">{format(new Date(d.date), 'EEE, MMM d, yyyy')}</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">{labels.stockLevel}:</span>
                <span className={cn('font-semibold', belowAlert && 'text-orange-600')}>
                  {fmtNum(stock)} {unit}
                </span>
              </div>
              {(d.added > 0 || d.used > 0) && (
                <div className="pt-1.5 mt-1.5 border-t space-y-0.5">
                  {d.added > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />
                      <span className="text-muted-foreground">{labels.added}:</span>
                      <span className="font-semibold text-emerald-600">+{d.added.toFixed(2)} {unit}</span>
                    </div>
                  )}
                  {d.used > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-sm bg-rose-500" />
                      <span className="text-muted-foreground">{labels.used}:</span>
                      <span className="font-semibold text-rose-600">-{d.used.toFixed(2)} {unit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

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
  
  // History state (paginated)
  const [recentHistory, setRecentHistory] = useState<(StockAdjustment & { itemName?: string; unit?: string })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

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

  // Fetch recent history when org is ready or page changes
  useEffect(() => {
    if (currentOrganization) {
      fetchRecentHistory(historyPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization, historyPage]);

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
            dailyData: item.dailyData.map(d => ({
              date: d.date,
              used: d.used,
              added: d.added,
              netChange: d.netChange,
            })),
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

  const fetchRecentHistory = async (page = 1) => {
    if (!currentOrganization) return;

    setHistoryLoading(true);
    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
        setOrganizationContext(currentOrganization.id);

        const res = await inventoryApi.getRecentActivity({ page, limit: historyLimit });
        setRecentHistory(res.data.items);
        setHistoryTotal(res.data.total);
        setHistoryTotalPages(res.data.totalPages);
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
                        <p className="text-2xl font-bold text-red-600">
                          {selectedItemDailyData.reduce((sum, d) => sum + d.used, 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("reports.totalUsed")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedItemDailyData.reduce((sum, d) => sum + d.added, 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("reports.totalAdded")}</p>
                      </div>
                      <div className="text-center">
                        {(() => {
                          const net = selectedItemDailyData.reduce((sum, d) => sum + d.netChange, 0);
                          return (
                            <p className={cn(
                              "text-2xl font-bold",
                              net > 0 ? "text-green-600" : net < 0 ? "text-red-600" : "text-foreground",
                            )}>
                              {net > 0 ? "+" : ""}{net.toFixed(1)}
                            </p>
                          );
                        })()}
                        <p className="text-xs text-muted-foreground">{t("reports.net")}</p>
                      </div>
                    </div>

                    {/* Stock Movement Chart */}
                    <StockMovementChart
                      data={selectedItemDailyData.slice(-30)}
                      unit={selectedItem?.unit || ''}
                      currentStock={Number(selectedItem?.currentStock) || 0}
                      minStockAlert={Number(selectedItem?.minStockAlert) || 0}
                      labels={{
                        added: t("reports.added"),
                        used: t("reports.used"),
                        net: t("reports.net"),
                        stockLevel: t("reports.stockLevel"),
                        minAlert: t("reports.minAlertLine"),
                      }}
                    />
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
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t("reports.recentActivity")}
                  </CardTitle>
                  <CardDescription>{t("reports.recentActivityDesc")}</CardDescription>
                </div>
                {historyTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("reports.showingActivity", {
                      from: (historyPage - 1) * historyLimit + 1,
                      to: Math.min(historyPage * historyLimit, historyTotal),
                      total: historyTotal,
                    })}
                  </p>
                )}
              </div>
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
                          {adj.unit ? <span className="text-xs text-muted-foreground ml-1">{adj.unit}</span> : null}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(adj.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {historyPage} / {historyTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1 || historyLoading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {tCommon("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage >= historyTotalPages || historyLoading}
                    >
                      {tCommon("next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
