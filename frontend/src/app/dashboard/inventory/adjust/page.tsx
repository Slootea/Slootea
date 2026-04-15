"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/hooks/use-inventory";
import { InventoryItem } from "@/lib/api";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpDown, Package, Minus, Plus, TrendingDown, PackagePlus,
  Loader2, Search
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";

export default function InventoryAdjustPage() {
  const searchParams = useSearchParams();
  const initialItemId = searchParams.get("item");
  
  const { currentOrganization, isAdmin } = useOrganizationContext();
  const { allItems, loading, adjustStock, fetchItems } = useInventory();
  
  const t = useTranslations("inventoryPage");
  const { toast } = useToast();

  // Set page header
  useSetPageHeader(t("tabs.adjust"), t("adjust.description"));

  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustSearchQuery, setAdjustSearchQuery] = useState("");
  const [quickAdjustValue, setQuickAdjustValue] = useState(0);
  const [quickAdjustReason, setQuickAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Set initial item when loaded
  useEffect(() => {
    if (initialItemId && allItems.length > 0 && !selectedItemForAdjust) {
      const item = allItems.find(i => i.id === initialItemId);
      if (item) setSelectedItemForAdjust(item);
    }
  }, [initialItemId, allItems, selectedItemForAdjust]);

  const filteredItemsForAdjust = allItems.filter(item => 
    item.isActive && 
    (item.name.toLowerCase().includes(adjustSearchQuery.toLowerCase()) ||
     (item.sku && item.sku.toLowerCase().includes(adjustSearchQuery.toLowerCase())))
  );

  const handleQuickAdjust = async (amount: number) => {
    if (!selectedItemForAdjust || amount === 0) return;
    
    setSubmitting(true);
    try {
      const adjustType = amount > 0 ? "purchase" : "manual";
      await adjustStock(selectedItemForAdjust.id, { 
        quantity: amount, 
        type: adjustType as any,
        reason: quickAdjustReason || undefined 
      });
      // Refresh items to get updated stock
      await fetchItems();
      // Update selected item with new stock
      setSelectedItemForAdjust(prev => prev ? {
        ...prev,
        currentStock: prev.currentStock + amount
      } : null);
      setQuickAdjustValue(0);
      setQuickAdjustReason("");
      toast({ title: t("adjust.success") });
    } catch (error) {
      toast({ title: t("adjust.error"), variant: "destructive" });
    } finally {
      setSubmitting(false);
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
    <div className="container py-6">
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
    </div>
  );
}
