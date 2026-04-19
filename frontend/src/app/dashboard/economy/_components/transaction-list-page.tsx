"use client";

import { useEffect, useState, useCallback } from "react";
import { useEconomy } from "@/hooks/use-economy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { useToast } from "@/components/ui/use-toast";
import { TransactionItem, TransactionType, PaymentMethod } from "@/lib/api";

interface TransactionListPageProps {
  transactionType: TransactionType;
}

export default function TransactionListPage({ transactionType }: TransactionListPageProps) {
  const {
    transactions,
    loading,
    pagination,
    categories,
    currentOrganization,
    isAdmin,
    fetchTransactions,
    fetchCategories,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useEconomy();
  const t = useTranslations("economyPage");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const isExpense = transactionType === "expense";
  const pageTitle = isExpense ? t("transactions.addExpense").replace("Add ", "") : t("transactions.addIncome").replace("Add ", "");

  useSetPageHeader(
    pageTitle + "s",
    t("description"),
  );

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash" as PaymentMethod,
    categoryId: "",
    notes: "",
    referenceNumber: "",
    contactName: "",
  });

  const loadData = useCallback(() => {
    fetchTransactions({
      type: transactionType,
      page,
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      sortBy: "date",
      sortOrder: "DESC",
    });
  }, [fetchTransactions, transactionType, page, search, categoryFilter]);

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      loadData();
      fetchCategories(transactionType);
    }
  }, [currentOrganization, isAdmin, loadData, fetchCategories, transactionType]);

  const resetForm = () => {
    setFormData({
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      categoryId: "",
      notes: "",
      referenceNumber: "",
      contactName: "",
    });
    setEditingTransaction(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (tx: TransactionItem) => {
    setEditingTransaction(tx);
    setFormData({
      amount: String(tx.amount),
      description: tx.description,
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      categoryId: tx.categoryId || "",
      notes: tx.notes || "",
      referenceNumber: tx.referenceNumber || "",
      contactName: tx.contactName || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.amount || !formData.description || !formData.date) return;
    setSaving(true);

    const payload = {
      type: transactionType,
      amount: Number(formData.amount),
      description: formData.description,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      categoryId: formData.categoryId || undefined,
      notes: formData.notes || undefined,
      referenceNumber: formData.referenceNumber || undefined,
      contactName: formData.contactName || undefined,
    };

    if (editingTransaction) {
      const result = await updateTransaction(editingTransaction.id, payload);
      if (result) {
        toast({ title: tCommon("success"), description: t("transactions.updatedSuccess") });
        setDialogOpen(false);
        loadData();
      }
    } else {
      const result = await createTransaction(payload);
      if (result) {
        toast({ title: tCommon("success"), description: t("transactions.createdSuccess") });
        setDialogOpen(false);
        loadData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const success = await deleteTransaction(deleteId);
    if (success) {
      toast({ title: tCommon("success"), description: t("transactions.deletedSuccess") });
      loadData();
    }
    setDeleteId(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: t("paymentMethods.cash"),
    credit_card: t("paymentMethods.credit_card"),
    bank_transfer: t("paymentMethods.bank_transfer"),
    check: t("paymentMethods.check"),
    other: t("paymentMethods.other"),
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

  return (
    <div className="container py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tCommon("search") + "..."}
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("transactions.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    {cat.color && (
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    )}
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {isExpense ? t("transactions.addExpense") : t("transactions.addIncome")}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowDownRight className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{t("transactions.noResults")}</p>
              <p className="text-sm text-muted-foreground">{t("transactions.noResultsDesc")}</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                {isExpense ? t("transactions.addExpense") : t("transactions.addIncome")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transactions.date")}</TableHead>
                  <TableHead>{t("transactions.description")}</TableHead>
                  <TableHead>{t("transactions.category")}</TableHead>
                  <TableHead>{t("transactions.contactName")}</TableHead>
                  <TableHead>{t("transactions.paymentMethod")}</TableHead>
                  <TableHead className="text-right">{t("transactions.amount")}</TableHead>
                  <TableHead className="w-[80px]">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.date}</TableCell>
                    <TableCell>
                      <div>
                        <span>{tx.description}</span>
                        {tx.source === "parasut" && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Paraşüt
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.categoryName ? (
                        <Badge
                          variant="secondary"
                          style={tx.categoryColor ? { backgroundColor: tx.categoryColor + "20", color: tx.categoryColor } : {}}
                        >
                          {tx.categoryName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{tx.contactName || "-"}</TableCell>
                    <TableCell>{paymentMethodLabels[tx.paymentMethod]}</TableCell>
                    <TableCell className={`text-right font-semibold ${isExpense ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(tx)} disabled={tx.source === "parasut"}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(tx.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon("showing")} {(pagination.page - 1) * pagination.limit + 1} {tCommon("to")}{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} {tCommon("of")}{" "}
            {pagination.total} {tCommon("results")}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon("previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tCommon("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction
                ? t("transactions.editTransaction")
                : isExpense
                  ? t("transactions.addExpense")
                  : t("transactions.addIncome")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("transactions.amount")} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("transactions.date")} *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("transactions.description")} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder={isExpense ? "Office supplies, rent, etc." : "Client payment, service fee, etc."}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("transactions.category")}</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(v) => setFormData((f) => ({ ...f, categoryId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("transactions.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("transactions.paymentMethod")}</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData((f) => ({ ...f, paymentMethod: v as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("paymentMethods.cash")}</SelectItem>
                    <SelectItem value="credit_card">{t("paymentMethods.credit_card")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("paymentMethods.bank_transfer")}</SelectItem>
                    <SelectItem value="check">{t("paymentMethods.check")}</SelectItem>
                    <SelectItem value="other">{t("paymentMethods.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("transactions.contactName")}</Label>
                <Input
                  value={formData.contactName}
                  onChange={(e) => setFormData((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("transactions.referenceNumber")}</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData((f) => ({ ...f, referenceNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("transactions.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.amount || !formData.description || !formData.date}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingTransaction ? tCommon("update") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transactions.deleteTransaction")}</AlertDialogTitle>
            <AlertDialogDescription>{t("transactions.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{tCommon("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
