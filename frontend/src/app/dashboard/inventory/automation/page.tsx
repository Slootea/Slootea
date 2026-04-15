"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { 
  Zap, 
  Bell, 
  Webhook, 
  Package, 
  Construction,
  AlertTriangle,
  LucideIcon
} from "lucide-react";

interface FeatureItem {
  icon: LucideIcon;
  translationKey: string;
}

const UPCOMING_FEATURES: FeatureItem[] = [
  {
    icon: AlertTriangle,
    translationKey: "lowStockAlerts",
  },
  {
    icon: Bell,
    translationKey: "notifications",
  },
  {
    icon: Webhook,
    translationKey: "webhook",
  },
  {
    icon: Package,
    translationKey: "autoReorder",
  },
];

export default function AutomationPage() {
  const t = useTranslations("inventoryPage.automation");
  
  useSetPageHeader(t("title"), t("subtitle"));

  return (
    <div className="container py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">{t("comingSoon")}</CardTitle>
          <CardDescription className="text-base">
            {t("comingSoonDescription")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t("featuresInDevelopment")}
            </h3>
            
            <div className="space-y-3">
              {UPCOMING_FEATURES.map((feature) => {
                const Icon = feature.icon;
                
                return (
                  <div 
                    key={feature.translationKey}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1">
                        {t(`features.${feature.translationKey}.title`)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t(`features.${feature.translationKey}.description`)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground text-center">
              <Zap className="h-4 w-4 inline mr-1" />
              {t("availableSoon")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
