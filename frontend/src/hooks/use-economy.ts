"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  economyApi,
  TransactionItem,
  TransactionType,
  PaginatedTransactionResponse,
  TransactionCategory,
  AnalyticsResponse,
  AnalyticsSummary,
  ParasutStatus,
} from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useToast } from "@/components/ui/use-toast";

export function useEconomy() {
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [parasutStatus, setParasutStatus] = useState<ParasutStatus | null>(null);

  const isAdmin = userRole === "owner" || userRole === "admin";

  // Token + org context are attached globally by AuthProvider + the axios
  // interceptor; we just need to verify an organization is selected.
  const setupAuth = useCallback(async () => {
    return Boolean(currentOrganization);
  }, [currentOrganization]);

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      search?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
    }) => {
      if (!(await setupAuth())) return;
      try {
        setLoading(true);
        const { data } = await economyApi.getTransactions(params);
        setTransactions(data.items);
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        });
      } catch {
        toast({ title: "Error", description: "Failed to load transactions", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [setupAuth, toast],
  );

  // Fetch categories
  const fetchCategories = useCallback(
    async (type?: TransactionType) => {
      if (!(await setupAuth())) return;
      try {
        const { data } = await economyApi.getCategories(type);
        setCategories(data);
      } catch {
        // silent
      }
    },
    [setupAuth],
  );

  // Fetch summary for current month
  const fetchSummary = useCallback(
    async (startDate: string, endDate: string) => {
      if (!(await setupAuth())) return;
      try {
        const { data } = await economyApi.getSummary({ startDate, endDate });
        setSummary(data);
      } catch {
        // silent
      }
    },
    [setupAuth],
  );

  // Fetch analytics
  const fetchAnalytics = useCallback(
    async (startDate: string, endDate: string, groupBy?: "day" | "week" | "month") => {
      if (!(await setupAuth())) return;
      try {
        const { data } = await economyApi.getAnalytics({ startDate, endDate, groupBy });
        setAnalytics(data);
      } catch {
        // silent
      }
    },
    [setupAuth],
  );

  // Fetch Parasut status
  const fetchParasutStatus = useCallback(async () => {
    if (!(await setupAuth())) return;
    try {
      const { data } = await economyApi.getParasutStatus();
      setParasutStatus(data);
    } catch {
      // silent
    }
  }, [setupAuth]);

  // Create transaction
  const createTransaction = useCallback(
    async (data: Parameters<typeof economyApi.createTransaction>[0]) => {
      if (!(await setupAuth())) return null;
      try {
        const res = await economyApi.createTransaction(data);
        return res.data;
      } catch {
        toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
        return null;
      }
    },
    [setupAuth, toast],
  );

  // Update transaction
  const updateTransaction = useCallback(
    async (id: string, data: Parameters<typeof economyApi.updateTransaction>[1]) => {
      if (!(await setupAuth())) return null;
      try {
        const res = await economyApi.updateTransaction(id, data);
        return res.data;
      } catch {
        toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
        return null;
      }
    },
    [setupAuth, toast],
  );

  // Delete transaction
  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!(await setupAuth())) return false;
      try {
        await economyApi.deleteTransaction(id);
        return true;
      } catch {
        toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
        return false;
      }
    },
    [setupAuth, toast],
  );

  // Create category
  const createCategory = useCallback(
    async (data: Parameters<typeof economyApi.createCategory>[0]) => {
      if (!(await setupAuth())) return null;
      try {
        const res = await economyApi.createCategory(data);
        return res.data;
      } catch {
        toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
        return null;
      }
    },
    [setupAuth, toast],
  );

  // Update category
  const updateCategory = useCallback(
    async (id: string, data: Parameters<typeof economyApi.updateCategory>[1]) => {
      if (!(await setupAuth())) return null;
      try {
        const res = await economyApi.updateCategory(id, data);
        return res.data;
      } catch {
        toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
        return null;
      }
    },
    [setupAuth, toast],
  );

  // Delete category
  const deleteCategory = useCallback(
    async (id: string) => {
      if (!(await setupAuth())) return false;
      try {
        await economyApi.deleteCategory(id);
        return true;
      } catch {
        toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
        return false;
      }
    },
    [setupAuth, toast],
  );

  return {
    // State
    transactions,
    loading,
    pagination,
    categories,
    summary,
    analytics,
    parasutStatus,
    isAdmin,
    currentOrganization,
    // Actions
    fetchTransactions,
    fetchCategories,
    fetchSummary,
    fetchAnalytics,
    fetchParasutStatus,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
