"use client"

import { Package, AlertTriangle, Archive, CheckCircle2, Search, LayoutGrid, List, MoreHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"

export function InventoryShowcase() {
  const t = useTranslations('landing.showcase.inventory')
  
  // Mock inventory items matching real structure
  const items = [
    { name: "Shampoo Pro", sku: "SHP-001", stock: 24, minAlert: 10, category: "consumable", status: "ok", image: true },
    { name: "Hair Color Mix", sku: "HCM-003", stock: 3, minAlert: 15, category: "consumable", status: "low", image: true },
    { name: "Massage Oil", sku: "MSO-005", stock: 2, minAlert: 8, category: "consumable", status: "low", image: false },
    { name: "Nail Polish Set", sku: "NPS-006", stock: 45, minAlert: 20, category: "retail", status: "ok", image: true },
    { name: "Body Lotion", sku: "BLT-008", stock: 0, minAlert: 5, category: "retail", status: "out", image: false },
  ]

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ok': return ''
      case 'low': return 'text-orange-600 font-semibold'
      case 'out': return 'text-red-600 font-semibold'
      default: return ''
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'low': return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="h-2 w-2" />
          {t('lowStock')}
        </span>
      )
      case 'out': return (
        <span className="inline-flex px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-medium text-red-600 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          {t('outOfStock')}
        </span>
      )
      default: return null
    }
  }

  const getCategoryBadge = (category: string) => {
    return category === 'retail' 
      ? 'bg-primary text-primary-foreground' 
      : 'bg-muted text-muted-foreground'
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-surface-container-low rounded-2xl shadow-ambient overflow-hidden aspect-[4/3] border">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-background/80 border-b">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 max-w-[200px] mx-auto">
            <div className="flex items-center gap-1 bg-muted/50 rounded px-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">slootea.com/inventory</span>
            </div>
          </div>
        </div>

        {/* Inventory Dashboard Content */}
        <div className="flex flex-col h-[calc(100%-37px)] bg-background p-2 sm:p-3 overflow-hidden">
          {/* Stats Cards Row */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2 shrink-0">
            {/* Total Items Card */}
            <div className="bg-card rounded-md border p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">{t('totalItems')}</span>
                <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
              </div>
              <div className="text-sm sm:text-base font-bold">156</div>
              <p className="text-[6px] sm:text-[7px] text-muted-foreground">142 active</p>
            </div>

            {/* Low Stock Card */}
            <div className="bg-card rounded-md border border-orange-200 dark:border-orange-900 p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">{t('lowStock')}</span>
                <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500" />
              </div>
              <div className="text-sm sm:text-base font-bold text-orange-600">8</div>
              <p className="text-[6px] sm:text-[7px] text-muted-foreground">2 {t('outOfStock')}</p>
            </div>

            {/* Categories Card */}
            <div className="bg-card rounded-md border p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">{t('category')}</span>
                <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm sm:text-base font-bold">98</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground">/ 58</span>
              </div>
              <p className="text-[6px] sm:text-[7px] text-muted-foreground">Cons / Retail</p>
            </div>

            {/* Health Card */}
            <div className="bg-card rounded-md border p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">{t('status')}</span>
                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
              </div>
              <div className="text-sm sm:text-base font-bold">87%</div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                <div className="h-full w-[87%] bg-green-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex items-center gap-2 mb-2 shrink-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded px-1.5 py-1 border">
              <Search className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[8px] sm:text-[9px] text-muted-foreground">{t('search')}</span>
            </div>
            <div className="flex items-center gap-0.5 bg-muted/30 rounded px-1 py-0.5 border">
              <span className="text-[7px] sm:text-[8px] text-muted-foreground">All</span>
            </div>
            <div className="flex gap-0.5">
              <div className="p-1 bg-muted rounded">
                <List className="h-2.5 w-2.5 text-foreground" />
              </div>
              <div className="p-1 rounded">
                <LayoutGrid className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Table View */}
          <div className="flex-1 bg-card rounded-md border overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center text-[7px] sm:text-[8px] text-muted-foreground font-medium px-2 py-1.5 border-b bg-muted/30">
              <div className="flex-[2]">{t('itemName')}</div>
              <div className="flex-1 hidden sm:block">SKU</div>
              <div className="flex-1">{t('category')}</div>
              <div className="flex-1 text-right">{t('stock')}</div>
              <div className="flex-1 text-right">{t('status')}</div>
              <div className="w-6"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {items.map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center text-[8px] sm:text-[9px] px-2 py-1.5 hover:bg-muted/20 transition-colors animate-fade-up"
                  style={{ animationDelay: `${250 + i * 40}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex-[2] flex items-center gap-1.5 min-w-0">
                    {item.image ? (
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex-1 text-muted-foreground truncate hidden sm:block">{item.sku}</div>
                  <div className="flex-1">
                    <span className={`inline-flex px-1 py-0.5 rounded text-[6px] sm:text-[7px] font-medium ${getCategoryBadge(item.category)}`}>
                      {item.category === 'retail' ? 'Retail' : 'Cons.'}
                    </span>
                  </div>
                  <div className={`flex-1 text-right ${getStatusStyle(item.status)}`}>
                    {item.stock} / {item.minAlert}
                  </div>
                  <div className="flex-1 flex justify-end">
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="w-6 flex justify-end">
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
