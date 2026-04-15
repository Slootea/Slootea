"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/hooks/use-inventory";
import { InventoryItem, InventoryCategory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageCropUpload } from "@/components/ui/image-crop-upload";
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
import { 
  Plus, Pencil, Trash2, Package, AlertTriangle, MoreHorizontal, Search, 
  LayoutGrid, List, ArrowUpDown, Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSetPageHeader } from "@/components/providers/page-header-provider";

export default function InventoryItemsPage() {
  const searchParams = useSearchParams();
  const initialLowStock = searchParams.get("lowStock") === "true";
  
  const { 
    items, 
    allItems,
    loading, 
    lowStockSummary, 
    pagination,
    stats,
    isAdmin, 
    currentOrganization,
    setPagination,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    toggleActive,
  } = useInventory();
  
  const t = useTranslations("inventoryPage");
  const tCommon = useTranslations("common");

  // Set page header
  useSetPageHeader(t("tabs.items"), t("description"));

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [lowStockFilter, setLowStockFilter] = useState(initialLowStock);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
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

  // Refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentOrganization) {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchItems({
          page: 1,
          search: searchQuery || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          lowStock: lowStockFilter || undefined,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, lowStockFilter, currentOrganization]);

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
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        costPerUnit: formData.costPerUnit || undefined,
        retailPrice: formData.retailPrice || undefined,
        imageBase64: formData.imageBase64 || undefined,
      };

      if (editingItem) {
        await updateItem(editingItem.id, submitData);
      } else {
        await createItem(submitData);
      }
      
      setDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
  };

  const handleToggleActive = async (item: InventoryItem) => {
    await toggleActive(item);
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
      <div className="flex items-center justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addItem")}
        </Button>
      </div>

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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/inventory/adjust?item=${item.id}`}>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            {t("adjustStock")}
                          </Link>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/inventory/adjust?item=${item.id}`}>
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          {t("adjustStock")}
                        </Link>
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
              onClick={() => {
                const newPage = pagination.page - 1;
                setPagination(prev => ({ ...prev, page: newPage }));
                fetchItems({ page: newPage });
              }}
            >
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => {
                const newPage = pagination.page + 1;
                setPagination(prev => ({ ...prev, page: newPage }));
                fetchItems({ page: newPage });
              }}
            >
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

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
