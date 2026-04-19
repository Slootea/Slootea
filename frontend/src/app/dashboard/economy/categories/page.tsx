"use client";

import { useEffect, useState } from "react";
import { useEconomy } from "@/hooks/use-economy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Tags,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { useToast } from "@/components/ui/use-toast";
import { TransactionCategory, TransactionType } from "@/lib/api";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#78716c",
];

export default function CategoriesPage() {
  const {
    categories,
    currentOrganization,
    isAdmin,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useEconomy();
  const t = useTranslations("economyPage");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  useSetPageHeader(t("categories.title"), t("categories.description"));

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as TransactionType,
    color: "#3b82f6",
    icon: "",
  });

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchCategories().then(() => setLoading(false));
    }
  }, [currentOrganization, isAdmin, fetchCategories]);

  const incomeCategories = categories.filter((c) => c.type === "income" && c.isActive);
  const expenseCategories = categories.filter((c) => c.type === "expense" && c.isActive);

  const resetForm = () => {
    setFormData({ name: "", type: "expense", color: "#3b82f6", icon: "" });
    setEditingCategory(null);
  };

  const openCreate = (type: TransactionType) => {
    resetForm();
    setFormData((f) => ({ ...f, type }));
    setDialogOpen(true);
  };

  const openEdit = (cat: TransactionCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      color: cat.color || "#3b82f6",
      icon: cat.icon || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setSaving(true);

    if (editingCategory) {
      const result = await updateCategory(editingCategory.id, {
        name: formData.name,
        color: formData.color,
        icon: formData.icon || undefined,
      });
      if (result) {
        toast({ title: tCommon("success"), description: t("categories.updatedSuccess") });
        setDialogOpen(false);
        fetchCategories();
      }
    } else {
      const result = await createCategory({
        name: formData.name,
        type: formData.type,
        color: formData.color,
        icon: formData.icon || undefined,
      });
      if (result) {
        toast({ title: tCommon("success"), description: t("categories.createdSuccess") });
        setDialogOpen(false);
        fetchCategories();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const success = await deleteCategory(deleteId);
    if (success) {
      toast({ title: tCommon("success"), description: t("categories.deletedSuccess") });
      fetchCategories();
    }
    setDeleteId(null);
  };

  if (!currentOrganization) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("noOrganization")}</p></div>;
  }
  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("adminOnly")}</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderCategoryList = (cats: TransactionCategory[], type: TransactionType) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {type === "income" ? t("categories.incomeCategories") : t("categories.expenseCategories")}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => openCreate(type)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("categories.addCategory")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Tags className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t("categories.noCategories")}</p>
            <p className="text-xs text-muted-foreground">{t("categories.noCategoriesDesc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || "#3b82f6" }}
                  />
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {renderCategoryList(expenseCategories, "expense")}
        {renderCategoryList(incomeCategories, "income")}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("categories.editCategory") : t("categories.addCategory")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("categories.name")} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Utilities, Rent, Services..."
              />
            </div>
            {!editingCategory && (
              <div className="space-y-2">
                <Label>{t("categories.type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((f) => ({ ...f, type: v as TransactionType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t("transactions.expense")}</SelectItem>
                    <SelectItem value="income">{t("transactions.income")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("categories.color")}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((f) => ({ ...f, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCategory ? tCommon("update") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.deleteCategory")}</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category. Transactions using this category will become uncategorized.
            </AlertDialogDescription>
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
