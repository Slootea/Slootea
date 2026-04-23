"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { inventoryApi, InventoryItem, InventoryCategory, LowStockSummary, DailyUsageReport, ItemUsageReport } from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  consumables: number;
  retail: number;
  totalValue: number;
  healthPercentage: number;
}

export interface UseInventoryOptions {
  autoFetch?: boolean;
}

export function useInventory(options: UseInventoryOptions = { autoFetch: true }) {
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("inventoryPage");
  const tCommon = useTranslations("common");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockSummary, setLowStockSummary] = useState<LowStockSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Computed stats
  const stats: InventoryStats = useMemo(() => {
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

  const setupAuth = useCallback(async () => {
    // Token + org context are attached globally; just verify selection.
    return Boolean(currentOrganization);
  }, [currentOrganization]);

  const fetchItems = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: InventoryCategory;
    lowStock?: boolean;
  }) => {
    if (!currentOrganization) return;
    
    const isAuthed = await setupAuth();
    if (!isAuthed) return;

    try {
      const queryParams = {
        page: params?.page ?? pagination.page,
        limit: params?.limit ?? pagination.limit,
        search: params?.search,
        category: params?.category,
        lowStock: params?.lowStock,
      };

      const [itemsRes, lowStockRes, allItemsRes] = await Promise.all([
        inventoryApi.getAll(queryParams),
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
  }, [currentOrganization, setupAuth, pagination.page, pagination.limit, toast, t, tCommon]);

  const createItem = useCallback(async (data: {
    name: string;
    sku?: string;
    description?: string;
    category?: InventoryCategory;
    unit?: string;
    currentStock?: number;
    minStockAlert?: number;
    costPerUnit?: number;
    retailPrice?: number;
    imageBase64?: string;
    isActive?: boolean;
  }) => {
    const isAuthed = await setupAuth();
    if (!isAuthed) return null;

    try {
      const response = await inventoryApi.create(data);
      toast({ title: t("messages.created") });
      await fetchItems();
      return response.data;
    } catch (error: any) {
      toast({
        title: tCommon("error"),
        description: error?.response?.data?.message || t("messages.saveFailed"),
        variant: "destructive",
      });
      return null;
    }
  }, [setupAuth, fetchItems, toast, t, tCommon]);

  const updateItem = useCallback(async (id: string, data: Partial<{
    name: string;
    sku: string;
    description: string;
    category: InventoryCategory;
    unit: string;
    minStockAlert: number;
    costPerUnit: number;
    retailPrice: number;
    imageBase64: string;
    isActive: boolean;
  }>) => {
    const isAuthed = await setupAuth();
    if (!isAuthed) return null;

    try {
      const response = await inventoryApi.update(id, data);
      toast({ title: t("messages.updated") });
      await fetchItems();
      return response.data;
    } catch (error: any) {
      toast({
        title: tCommon("error"),
        description: error?.response?.data?.message || t("messages.saveFailed"),
        variant: "destructive",
      });
      return null;
    }
  }, [setupAuth, fetchItems, toast, t, tCommon]);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm(t("confirmDelete"))) return false;
    
    const isAuthed = await setupAuth();
    if (!isAuthed) return false;

    try {
      await inventoryApi.delete(id);
      toast({ title: t("messages.deleted") });
      await fetchItems();
      return true;
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteFailed"),
        variant: "destructive",
      });
      return false;
    }
  }, [setupAuth, fetchItems, toast, t, tCommon]);

  const adjustStock = useCallback(async (id: string, data: {
    quantity: number;
    type?: 'manual' | 'purchase' | 'correction';
    reason?: string;
  }) => {
    const isAuthed = await setupAuth();
    if (!isAuthed) return null;

    try {
      const response = await inventoryApi.adjustStock(id, data);
      toast({ title: t("messages.stockAdjusted") });
      await fetchItems();
      return response.data;
    } catch (error: any) {
      toast({
        title: tCommon("error"),
        description: error?.response?.data?.message || t("messages.adjustFailed"),
        variant: "destructive",
      });
      return null;
    }
  }, [setupAuth, fetchItems, toast, t, tCommon]);

  const toggleActive = useCallback(async (item: InventoryItem) => {
    const isAuthed = await setupAuth();
    if (!isAuthed) return false;

    try {
      await inventoryApi.update(item.id, { isActive: !item.isActive });
      toast({ title: item.isActive ? t("messages.deactivated") : t("messages.activated") });
      await fetchItems();
      return true;
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.toggleFailed"),
        variant: "destructive",
      });
      return false;
    }
  }, [setupAuth, fetchItems, toast, t, tCommon]);

  const fetchReportData = useCallback(async (params: {
    startDate: string;
    endDate: string;
    itemId?: string;
    category?: InventoryCategory;
  }): Promise<DailyUsageReport | null> => {
    const isAuthed = await setupAuth();
    if (!isAuthed) return null;

    try {
      const response = await inventoryApi.getDailyUsageReport(params);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch report data", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
      return null;
    }
  }, [setupAuth, toast, t, tCommon]);

  // Auto fetch on mount
  useEffect(() => {
    if (options.autoFetch && currentOrganization) {
      fetchItems();
    }
  }, [options.autoFetch, currentOrganization]);

  return {
    // Data
    items,
    allItems,
    loading,
    lowStockSummary,
    pagination,
    stats,
    isAdmin,
    currentOrganization,

    // Setters
    setPagination,

    // Actions
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
    toggleActive,
    fetchReportData,
  };
}
