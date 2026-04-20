"use client";

import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function NotificationsPage() {
  const t = useTranslations("notificationsPage");

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-base">
            {t("workInProgress")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
