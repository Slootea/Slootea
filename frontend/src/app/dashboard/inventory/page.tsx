"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { inventoryApi, setAuthToken, setOrganizationContext, InventoryItem, InventoryCategory, PaginatedInventoryResponse, LowStockSummary, StockAdjustment, DailyUsageReport, ItemUsageReport } from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ImageCropUpload } from "@/components/ui/image-crop-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, Pencil, Trash2, Package, AlertTriangle, MoreHorizontal, Search, 
  LayoutGrid, List, ArrowUpDown, Loader2, TrendingUp, TrendingDown,
  BarChart3, ShoppingCart, Archive, CheckCircle2, XCircle, Minus, PackagePlus,
  LineChart as LineChartIcon, Calendar
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InventoryPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("inventoryPage");
  const tCommon = useTranslations("common");

  const [activeTab, setActiveTab] = useState("overview");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockSummary, setLowStockSummary] = useState<LowStockSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Quick adjustment state
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [quickAdjustValue, setQuickAdjustValue] = useState<number>(0);
  const [quickAdjustReason, setQuickAdjustReason] = useState("");
  const [adjustSearchQuery, setAdjustSearchQuery] = useState("");
  
  // Reports state
  const [reportData, setReportData] = useState<DailyUsageReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDateRange, setReportDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });
  const [reportItemFilter, setReportItemFilter] = useState<string>("all");
  const [reportCategoryFilter, setReportCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [selectedReportItem, setSelectedReportItem] = useState<ItemUsageReport | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "consumable" as InventoryCategory,
    unit: "pcs",
    currentStock: 0,
    minStockAlert: 0,
    costPerUnit: 0,
    retailPrice: 0,
    imageBase64: "" as string | undefined,
    isActive: true,
  });

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Computed stats
  const stats = useMemo(() => {
    const totalItems = allItems.length;
    const activeItems = allItems.filter(i => i.isActive).length;
    const lowStockItems = allItems.filter(i => i.isLowStock && i.isActive).length;
    const outOfStockItems = allItems.filter(i => i.currentStock === 0 && i.isActive).length;
    const consumables = allItems.filter(i => i.category === 'consumable').length;
    const retail = allItems.filter(i => i.category === 'retail').length;
    const totalValue = allItems.reduce((sum, i) => sum + (i.currentStock * (i.costPerUnit || 0)), 0);
    const healthyItems = allItems.filter(i => !i.isLowStock && i.currentStock > 0 && i.isActive).length;
    const healthPercentage = activeItems > 0 ? Math.round((healthyItems / activeItems) * 100) : 100;
    
    return { totalItems, activeItems, lowStockItems, outOfStockItems, consumables, retail, totalValue, healthPercentage };
  }, [allItems]);

  // Filter items for adjustment tab
  const filteredItemsForAdjust = useMemo(() => {
    if (!adjustSearchQuery) return allItems.filter(i => i.isActive);
    const query = adjustSearchQuery.toLowerCase();
    return allItems.filter(i => 
      i.isActive && (i.name.toLowerCase().includes(query) || (i.sku?.toLowerCase().includes(query)))
    );
  }, [allItems, adjustSearchQuery]);

  const fetchItems = useCallback(async () => {
    if (!currentOrganization) return;
    
    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const params: {
        page: number;
        limit: number;
        search?: string;
        category?: InventoryCategory;
        lowStock?: boolean;
      } = {
        page: pagination.page,
        limit: pagination.limit,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (lowStockFilter) params.lowStock = true;

      const [itemsRes, lowStockRes, allItemsRes] = await Promise.all([
        inventoryApi.getAll(params),
        inventoryApi.getLowStock(),
        inventoryApi.getAll({ page: 1, limit: 1000 }),
      ]);
      
      setItems(itemsRes.data.items);
      setAllItems(allItemsRes.data.items);
      setPagination(prev => ({
        ...prev,
        total: itemsRes.data.total,
        totalPages: itemsRes.data.totalPages,
      }));
      setLowStockSummary(lowStockRes.data);
    } catch (error) {
      console.error("Failed to fetch inventory items", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getToken, pagination.page, pagination.limit, searchQuery, categoryFilter, lowStockFilter, toast, t, tCommon]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentOrganization) {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchItems();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchReportData = useCallback(async () => {
    if (!currentOrganization) return;
    
    setReportLoading(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const params: {
        startDate: string;
        endDate: string;
        itemId?: string;
        category?: InventoryCategory;
      } = {
        startDate: reportDateRange.startDate,
        endDate: reportDateRange.endDate,
      };

      if (reportItemFilter !== "all") params.itemId = reportItemFilter;
      if (reportCategoryFilter !== "all") params.category = reportCategoryFilter;

      const response = await inventoryApi.getDailyUsageReport(params);
      setReportData(response.data);
      
      // Auto-select first item if none selected
      if (response.data.items.length > 0 && !selectedReportItem) {
        setSelectedReportItem(response.data.items[0]);
      }
    } catch (error) {
      console.error("Failed to fetch report data", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  }, [currentOrganization, getToken, reportDateRange, reportItemFilter, reportCategoryFilter, toast, t, tCommon]);

  useEffect(() => {
    if (activeTab === "reports" && currentOrganization) {
      fetchReportData();
    }
  }, [activeTab, fetchReportData]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      category: "consumable",
      unit: "pcs",
      currentStock: 0,
      minStockAlert: 0,
      costPerUnit: 0,
      retailPrice: 0,
      imageBase64: undefined,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || "",
      description: item.description || "",
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minStockAlert: item.minStockAlert,
      costPerUnit: item.costPerUnit || 0,
      retailPrice: item.retailPrice || 0,
      imageBase64: item.imageBase64 || undefined,
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrganization) return;
    
    setSubmitting(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const submitData = {
        ...formData,
        costPerUnit: formData.costPerUnit || undefined,
        retailPrice: formData.retailPrice || undefined,
        imageBase64: formData.imageBase64 || undefined,
      };

      if (editingItem) {
        await inventoryApi.update(editingItem.id, submitData);
        toast({ title: t("messages.updated") });
      } else {
        await inventoryApi.create(submitData);
        toast({ title: t("messages.created") });
      }
      
      setDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      toast({
        title: tCommon("error"),
        description: error?.response?.data?.message || t("messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    if (!currentOrganization) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      
      await inventoryApi.delete(id);
      toast({ title: t("messages.deleted") });
      fetchItems();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleQuickAdjust = async (adjustment: number) => {
    if (!selectedItemForAdjust || !currentOrganization) return;
    
    setSubmitting(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      
      await inventoryApi.adjustStock(selectedItemForAdjust.id, {
        quantity: adjustment,
        type: "manual",
        reason: quickAdjustReason || undefined,
      });
      
      toast({ title: t("messages.stockAdjusted") });
      setQuickAdjustValue(0);
      setQuickAdjustReason("");
      fetchItems();
      
      setSelectedItemForAdjust(prev => prev ? {
        ...prev,
        currentStock: prev.currentStock + adjustment,
        isLowStock: (prev.currentStock + adjustment) <= prev.minStockAlert
      } : null);
    } catch (error: any) {
      toast({
        title: tCommon("error"),
        description: error?.response?.data?.message || t("messages.adjustFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: InventoryItem) => {
    if (!currentOrganization) return;
    
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      
      await inventoryApi.update(item.id, { isActive: !item.isActive });
      toast({ title: item.isActive ? t("messages.deactivated") : t("messages.activated") });
      fetchItems();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.toggleFailed"),
        variant: "destructive",
      });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addItem")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("tabs.items")}
          </TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {t("tabs.adjust")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            {t("tabs.reports")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => { setActiveTab("items"); setLowStockFilter(true); }}
                      >
                        {t("viewAll")} ({lowStockSummary.items.length - 6} {t("more")})
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
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {lowStockSummary && lowStockSummary.totalLowStockItems > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {t("lowStockAlert", { count: lowStockSummary.totalLowStockItems })}
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    {lowStockSummary.items.slice(0, 3).map(item => item.name).join(", ")}
                    {lowStockSummary.items.length > 3 && ` +${lowStockSummary.items.length - 3} ${t("more")}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                  className={lowStockFilter ? "bg-orange-100 dark:bg-orange-900" : ""}
                >
                  {lowStockFilter ? t("showAll") : t("viewLowStock")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-4 items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => setCategoryFilter(value as InventoryCategory | "all")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allCategories")}</SelectItem>
                      <SelectItem value="consumable">{t("categories.consumable")}</SelectItem>
                      <SelectItem value="retail">{t("categories.retail")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('table')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("noItems")}</p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addFirstItem")}
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.sku")}</TableHead>
                    <TableHead>{t("table.category")}</TableHead>
                    <TableHead className="text-right">{t("table.stock")}</TableHead>
                    <TableHead className="text-right">{t("table.minAlert")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.imageBase64 ? (
                            <img src={item.imageBase64} alt={item.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.category === "retail" ? "default" : "secondary"}>
                          {t(`categories.${item.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.isLowStock ? "text-orange-600 font-semibold" : ""}>
                          {item.currentStock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.minStockAlert} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.isLowStock && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {t("lowStock")}
                            </Badge>
                          )}
                          {!item.isActive && (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t("inactive")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedItemForAdjust(item); setActiveTab("adjust"); }}>
                              <ArrowUpDown className="h-4 w-4 mr-2" />
                              {t("adjustStock")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                              {item.isActive ? t("deactivate") : t("activate")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {item.imageBase64 ? (
                          <img src={item.imageBase64} alt={item.name} className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          {item.sku && <p className="text-sm text-muted-foreground">{item.sku}</p>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedItemForAdjust(item); setActiveTab("adjust"); }}>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            {t("adjustStock")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={item.category === "retail" ? "default" : "secondary"}>
                        {t(`categories.${item.category}`)}
                      </Badge>
                      {item.isLowStock && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t("lowStock")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold">
                      {item.currentStock} <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("minAlert")}: {item.minStockAlert} {item.unit}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("showing", {
                  from: (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  {tCommon("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("adjust.selectItem")}
                </CardTitle>
                <CardDescription>{t("adjust.selectItemDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    value={adjustSearchQuery}
                    onChange={(e) => setAdjustSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredItemsForAdjust.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemForAdjust(item)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItemForAdjust?.id === item.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
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
                        <p className={`font-bold ${item.isLowStock ? "text-orange-600" : ""}`}>
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
                  {filteredItemsForAdjust.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("noItems")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  {t("adjust.adjustStock")}
                </CardTitle>
                <CardDescription>{t("adjust.adjustStockDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedItemForAdjust ? (
                  <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-3">
                        {selectedItemForAdjust.imageBase64 ? (
                          <img src={selectedItemForAdjust.imageBase64} alt={selectedItemForAdjust.name} className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{selectedItemForAdjust.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedItemForAdjust.sku || "-"}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("currentStock")}</span>
                        <span className="text-xl font-bold">
                          {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>{t("adjust.quickAdjust")}</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[-10, -5, -1, 1, 5, 10, 25, 50].map(val => (
                          <Button
                            key={val}
                            variant={val < 0 ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => setQuickAdjustValue(prev => prev + val)}
                            className={val < 0 ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                          >
                            {val > 0 ? `+${val}` : val}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("adjust.customAmount")}</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setQuickAdjustValue(prev => prev - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <NumberInput
                          value={quickAdjustValue}
                          onChange={(val) => setQuickAdjustValue(val ?? 0)}
                          className="flex-1 text-center text-lg font-bold"
                        />
                        <Button variant="outline" size="icon" onClick={() => setQuickAdjustValue(prev => prev + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("form.reason")}</Label>
                      <Textarea
                        value={quickAdjustReason}
                        onChange={(e) => setQuickAdjustReason(e.target.value)}
                        placeholder={t("form.reasonPlaceholder")}
                        rows={2}
                      />
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${
                      quickAdjustValue > 0 
                        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" 
                        : quickAdjustValue < 0 
                          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" 
                          : "border-muted"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t("newStock")}</span>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {selectedItemForAdjust.currentStock + quickAdjustValue} {selectedItemForAdjust.unit}
                          </p>
                          {quickAdjustValue !== 0 && (
                            <p className={`text-sm ${quickAdjustValue > 0 ? "text-green-600" : "text-red-600"}`}>
                              {quickAdjustValue > 0 ? "+" : ""}{quickAdjustValue} {selectedItemForAdjust.unit}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleQuickAdjust(quickAdjustValue)}
                      disabled={submitting || quickAdjustValue === 0 || (selectedItemForAdjust.currentStock + quickAdjustValue) < 0}
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {quickAdjustValue > 0 ? (
                        <>
                          <PackagePlus className="h-4 w-4 mr-2" />
                          {t("adjust.addStock")}
                        </>
                      ) : quickAdjustValue < 0 ? (
                        <>
                          <TrendingDown className="h-4 w-4 mr-2" />
                          {t("adjust.removeStock")}
                        </>
                      ) : (
                        t("confirmAdjust")
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium">{t("adjust.noItemSelected")}</p>
                    <p className="text-sm text-muted-foreground">{t("adjust.noItemSelectedDesc")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("reports.filters")}
              </CardTitle>
              <CardDescription>{t("reports.filtersDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>{t("reports.startDate")}</Label>
                  <Input
                    type="date"
                    value={reportDateRange.startDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("reports.endDate")}</Label>
                  <Input
                    type="date"
                    value={reportDateRange.endDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("reports.product")}</Label>
                  <Select
                    value={reportItemFilter}
                    onValueChange={(value) => {
                      setReportItemFilter(value);
                      setSelectedReportItem(null);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("reports.allProducts")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("reports.allProducts")}</SelectItem>
                      {allItems.filter(i => i.isActive).map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("form.category")}</Label>
                  <Select
                    value={reportCategoryFilter}
                    onValueChange={(value) => setReportCategoryFilter(value as InventoryCategory | "all")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allCategories")}</SelectItem>
                      <SelectItem value="consumable">{t("categories.consumable")}</SelectItem>
                      <SelectItem value="retail">{t("categories.retail")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchReportData} disabled={reportLoading}>
                  {reportLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("reports.generate")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : reportData && reportData.items.length > 0 ? (
            <>
              <div className="grid gap-4 lg:grid-cols-4">
                {reportData.items.length > 1 && (
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{t("reports.selectProduct")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                      {reportData.items.map(item => (
                        <div
                          key={item.itemId}
                          onClick={() => setSelectedReportItem(item)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedReportItem?.itemId === item.itemId 
                              ? "border-primary bg-primary/5" 
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{item.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-red-600">-{item.totalUsed}</p>
                            <p className="text-xs text-green-600">+{item.totalAdded}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className={reportData.items.length > 1 ? "lg:col-span-3" : "lg:col-span-4"}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChartIcon className="h-5 w-5" />
                      {selectedReportItem ? selectedReportItem.itemName : t("reports.dailyUsage")}
                    </CardTitle>
                    <CardDescription>
                      {selectedReportItem && (
                        <span className="flex gap-4">
                          <span className="text-red-600">{t("reports.totalUsed")}: {selectedReportItem.totalUsed} {selectedReportItem.unit}</span>
                          <span className="text-green-600">{t("reports.totalAdded")}: {selectedReportItem.totalAdded} {selectedReportItem.unit}</span>
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedReportItem ? (
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={selectedReportItem.dailyData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString();
                              }}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="used" 
                              name={t("reports.used")}
                              stroke="#ef4444" 
                              strokeWidth={2}
                              dot={{ fill: '#ef4444', strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="added" 
                              name={t("reports.added")}
                              stroke="#22c55e" 
                              strokeWidth={2}
                              dot={{ fill: '#22c55e', strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <LineChartIcon className="h-12 w-12 mb-4" />
                        <p>{t("reports.selectProductToView")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <LineChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-medium">{t("reports.noData")}</p>
                <p className="text-sm text-muted-foreground">{t("reports.noDataDesc")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? t("editItem") : t("addItem")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("form.name")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("form.namePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">{t("form.sku")}</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("form.category")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as InventoryCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumable">{t("categories.consumable")}</SelectItem>
                    <SelectItem value="retail">{t("categories.retail")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("form.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("form.descriptionPlaceholder")}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">{t("form.unit")}</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">{t("units.pcs")}</SelectItem>
                    <SelectItem value="ml">{t("units.ml")}</SelectItem>
                    <SelectItem value="g">{t("units.g")}</SelectItem>
                    <SelectItem value="kg">{t("units.kg")}</SelectItem>
                    <SelectItem value="L">{t("units.L")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentStock">{t("form.currentStock")}</Label>
                <NumberInput
                  id="currentStock"
                  value={formData.currentStock}
                  onChange={(value) => setFormData({ ...formData, currentStock: value ?? 0 })}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStockAlert">{t("form.minStockAlert")}</Label>
              <NumberInput
                id="minStockAlert"
                value={formData.minStockAlert}
                onChange={(value) => setFormData({ ...formData, minStockAlert: value ?? 0 })}
                min={0}
                step={0.01}
              />
              <p className="text-sm text-muted-foreground">{t("form.minStockAlertHelp")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPerUnit">{t("form.costPerUnit")}</Label>
                <NumberInput
                  id="costPerUnit"
                  value={formData.costPerUnit}
                  onChange={(value) => setFormData({ ...formData, costPerUnit: value ?? 0 })}
                  min={0}
                  step={0.01}
                />
              </div>
              {formData.category === "retail" && (
                <div className="space-y-2">
                  <Label htmlFor="retailPrice">{t("form.retailPrice")}</Label>
                  <NumberInput
                    id="retailPrice"
                    value={formData.retailPrice}
                    onChange={(value) => setFormData({ ...formData, retailPrice: value ?? 0 })}
                    min={0}
                    step={0.01}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("form.image")}</Label>
              <ImageCropUpload
                value={formData.imageBase64}
                onChange={(value) => setFormData({ ...formData, imageBase64: value || undefined })}
                aspectRatio={1}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">{t("form.isActive")}</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.name}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
