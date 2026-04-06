"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { ServiceHeaderProps } from "./types";

export function ServiceHeader({ service }: ServiceHeaderProps) {
  const t = useTranslations('booking');

  return (
    <Card className="mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
      <CardContent className="p-4 flex items-center gap-4">
        {service.imageBase64 ? (
          <img
            src={service.imageBase64}
            alt={service.title}
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-muted flex items-center justify-center">
            <CalendarIcon className="h-7 w-7 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{service.title}</h2>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
            {service.duration} {t('minutes')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
