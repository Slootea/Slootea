"use client";

import Link from "next/link";
import { Bell, ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

export function NotificationsDropdown() {
  const t = useTranslations("notificationsDropdown");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-surface-container transition-colors"
          aria-label={t("title")}
        >
          <Bell className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold text-sm">{t("title")}</h3>
        </div>
        <DropdownMenuSeparator />
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" className="w-full justify-between" asChild>
            <Link href="/dashboard/notifications">
              {t("seeAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
